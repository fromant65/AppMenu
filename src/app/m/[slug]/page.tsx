import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { MenuViewer } from "~/components/menu/menu-viewer";
import { api } from "~/trpc/server";

// ─── Metadata dinámica ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const menu = await api.menu.getBySlug({ slug });
    return {
      title: `${menu.title} — ${menu.user.businessName ?? "Menú digital"}`,
      description: `Consultá el menú digital de ${menu.user.businessName ?? menu.title}`,
      openGraph: {
        title: menu.title,
        description: `Menú digital de ${menu.user.businessName ?? menu.title}`,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Menú no disponible",
    };
  }
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let menu;
  try {
    menu = await api.menu.getBySlug({ slug });
  } catch (err: unknown) {
    // NOT_FOUND o menú no publicado → 404
    const code =
      err &&
      typeof err === "object" &&
      "data" in err &&
      err.data &&
      typeof err.data === "object" &&
      "code" in err.data
        ? (err.data as { code: string }).code
        : null;

    if (code === "NOT_FOUND" || code === "FORBIDDEN") {
      notFound();
    }

    // Error inesperado — relanzar para que lo tome error.tsx
    throw err;
  }

  return (
    <MenuViewer
      businessName={menu.user.businessName ?? menu.title}
      menuTitle={menu.title}
      pages={menu.pages}
    />
  );
}
