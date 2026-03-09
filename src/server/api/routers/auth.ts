import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { uniqueSlug } from "~/lib/slugify";

export const authRouter = createTRPCRouter({
  /**
   * Registra un nuevo usuario con email, contraseña y datos del negocio.
   * - Verifica que el email no esté en uso
   * - Hashea la contraseña con bcrypt (12 rounds)
   * - Genera un businessSlug único desde el nombre del negocio
   * - Crea el usuario con subscriptionStatus = 'trial' y expiry = 14 días
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
        name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
        businessName: z
          .string()
          .min(2, "El nombre del negocio debe tener al menos 2 caracteres"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Verificar que el email no esté en uso
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existing) {
        throw new Error("Ya existe una cuenta con ese email");
      }

      // 2. Hash de la contraseña
      const passwordHash = await bcrypt.hash(input.password, 12);

      // 3. Generar businessSlug único
      const existingSlugs = await ctx.db
        .select({ slug: users.businessSlug })
        .from(users);
      const slugList = existingSlugs
        .map((r) => r.slug)
        .filter(Boolean) as string[];
      const businessSlug = uniqueSlug(input.businessName, slugList);

      // 4. Calcular expiración del trial (14 días)
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 14);

      // 5. Insertar usuario
      await ctx.db.insert(users).values({
        email: input.email,
        passwordHash,
        name: input.name,
        businessName: input.businessName,
        businessSlug,
        subscriptionStatus: "trial",
        subscriptionExpiry: trialExpiry,
      });

      return { success: true };
    }),
});
