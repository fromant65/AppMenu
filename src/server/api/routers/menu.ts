import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";

import { env } from "~/env";
import { createAdminClient, buildStoragePath, MENUS_BUCKET, getPublicUrl } from "~/lib/supabase";
import { uniqueSlug } from "~/lib/slugify";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { menus, menuPages } from "~/server/db/schema";
import { type PriceAnnotation } from "~/types/menu";

export const menuRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // Crear un nuevo menú vacío
  // -------------------------------------------------------------------------
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1, "El título es requerido").max(255) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verificar límite de 1 menú por usuario
      const existingMenus = await ctx.db
        .select({ id: menus.id })
        .from(menus)
        .where(eq(menus.userId, userId));

      if (existingMenus.length >= 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Por ahora cada cuenta puede tener un solo menú. Pronto vamos a ampliar esta funcionalidad.",
        });
      }

      // Slug único basado en el título
      const existingSlugs = await ctx.db.select({ slug: menus.slug }).from(menus);
      const slugList = existingSlugs.map((r) => r.slug);
      const slug = uniqueSlug(input.title, slugList);

      const [menu] = await ctx.db
        .insert(menus)
        .values({ userId, title: input.title, slug })
        .returning();

      return menu!;
    }),

  // -------------------------------------------------------------------------
  // Listar todos los menús del usuario autenticado
  // -------------------------------------------------------------------------
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return ctx.db.query.menus.findMany({
      where: eq(menus.userId, userId),
      with: { pages: { orderBy: (p) => [asc(p.pageNumber)] } },
      orderBy: [desc(menus.createdAt)],
    });
  }),

  // -------------------------------------------------------------------------
  // Obtener un menú específico del usuario (por ID)
  // -------------------------------------------------------------------------
  getById: protectedProcedure
    .input(z.object({ menuId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
        with: { pages: { orderBy: (p) => [asc(p.pageNumber)] } },
      });

      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });
      return menu;
    }),

  // -------------------------------------------------------------------------
  // Generar URL de subida firmada para una página
  // Flujo: client llama getUploadUrl → sube el archivo directo a Supabase →
  //        llama confirmUpload para registrar la página en la DB
  // -------------------------------------------------------------------------
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        menuId: z.number().int(),
        fileName: z.string(),
        pageNumber: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verificar propiedad del menú
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      const supabase = createAdminClient();
      const path = buildStoragePath(
        userId,
        input.menuId,
        `p${String(input.pageNumber).padStart(3, "0")}-${input.fileName}`,
      );

      const { data, error } = await supabase.storage
        .from(MENUS_BUCKET)
        .createSignedUploadUrl(path);

      if (error ?? !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "No se pudo generar la URL de subida",
        });
      }

      return { signedUrl: data.signedUrl, path };
    }),

  // -------------------------------------------------------------------------
  // Confirmar que un archivo fue subido y crear el registro de página
  // -------------------------------------------------------------------------
  confirmUpload: protectedProcedure
    .input(
      z.object({
        menuId: z.number().int(),
        pageNumber: z.number().int().min(1),
        storagePath: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verificar propiedad
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const imageUrl = getPublicUrl(supabaseUrl, input.storagePath);

      // Si ya existe la página (re-subida), actualizar; si no, insertar
      const existing = await ctx.db.query.menuPages.findFirst({
        where: and(
          eq(menuPages.menuId, input.menuId),
          eq(menuPages.pageNumber, input.pageNumber),
        ),
      });

      if (existing) {
        await ctx.db
          .update(menuPages)
          .set({ imageUrl })
          .where(eq(menuPages.id, existing.id));
      } else {
        await ctx.db.insert(menuPages).values({
          menuId: input.menuId,
          pageNumber: input.pageNumber,
          imageUrl,
          annotations: [],
        });
      }

      return { imageUrl };
    }),

  // -------------------------------------------------------------------------
  // Obtener menú por slug (ruta pública /m/[slug])
  // Verifica que esté publicado y que la suscripción esté activa
  // -------------------------------------------------------------------------
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const menu = await ctx.db.query.menus.findFirst({
        where: eq(menus.slug, input.slug),
        with: {
          pages: { orderBy: (p) => [asc(p.pageNumber)] },
          user: {
            columns: {
              businessName: true,
              subscriptionStatus: true,
              subscriptionExpiry: true,
            },
          },
        },
      });

      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });
      if (!menu.isPublished) throw new TRPCError({ code: "NOT_FOUND" });

      const { subscriptionStatus, subscriptionExpiry } = menu.user;
      const isActive =
        subscriptionStatus === "active" ||
        (subscriptionStatus === "trial" &&
          subscriptionExpiry !== null &&
          subscriptionExpiry > new Date());

      if (!isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "La suscripción del negocio está inactiva",
        });
      }

      return menu;
    }),

  // -------------------------------------------------------------------------
  // Actualizar las anotaciones de precio de una página
  // -------------------------------------------------------------------------
  updateAnnotations: protectedProcedure
    .input(
      z.object({
        pageId: z.number().int(),
        annotations: z.array(
          z.object({
            id: z.string(),
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            text: z.string(),
            fontSize: z.number().optional(),
            color: z.string().optional(),
            fontWeight: z.enum(["normal", "bold"]).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verificar propiedad a través del menú
      const page = await ctx.db.query.menuPages.findFirst({
        where: eq(menuPages.id, input.pageId),
        with: { menu: { columns: { userId: true } } },
      });

      if (!page || page.menu.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db
        .update(menuPages)
        .set({ annotations: input.annotations as PriceAnnotation[] })
        .where(eq(menuPages.id, input.pageId));

      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // Publicar / despublicar un menú
  // -------------------------------------------------------------------------
  publish: protectedProcedure
    .input(z.object({ menuId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(menus)
        .set({ isPublished: true })
        .where(eq(menus.id, input.menuId));

      return { success: true };
    }),

  unpublish: protectedProcedure
    .input(z.object({ menuId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(menus)
        .set({ isPublished: false })
        .where(eq(menus.id, input.menuId));

      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // Generar QR como data URL
  // -------------------------------------------------------------------------
  getQR: protectedProcedure
    .input(z.object({ menuId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const menuUrl = `${appUrl}/m/${menu.slug}`;

      const qrDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      return { qrDataUrl, menuUrl };
    }),

  // -------------------------------------------------------------------------
  // Eliminar un menú (cascade elimina páginas en la DB)
  // -------------------------------------------------------------------------
  delete: protectedProcedure
    .input(z.object({ menuId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.delete(menus).where(eq(menus.id, input.menuId));
      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // Actualizar título de un menú
  // -------------------------------------------------------------------------
  updateTitle: protectedProcedure
    .input(
      z.object({
        menuId: z.number().int(),
        title: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const menu = await ctx.db.query.menus.findFirst({
        where: and(eq(menus.id, input.menuId), eq(menus.userId, userId)),
      });
      if (!menu) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(menus)
        .set({ title: input.title })
        .where(eq(menus.id, input.menuId));

      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // Eliminar una página individual de un menú
  // -------------------------------------------------------------------------
  deletePage: protectedProcedure
    .input(z.object({ pageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verificar propiedad a través del menú
      const page = await ctx.db.query.menuPages.findFirst({
        where: eq(menuPages.id, input.pageId),
        with: { menu: { columns: { userId: true } } },
      });

      if (!page || page.menu.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.delete(menuPages).where(eq(menuPages.id, input.pageId));
      return { success: true };
    }),
});
