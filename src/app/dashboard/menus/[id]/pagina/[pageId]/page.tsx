"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { PriceEditor } from "~/components/menu/price-editor";
import { Button } from "~/components/ui/button";
import { type PriceAnnotation } from "~/types/menu";
import { api } from "~/trpc/react";

export default function PageEditorPage() {
  const params = useParams<{ id: string; pageId: string }>();
  const router = useRouter();
  const menuId = parseInt(params.id ?? "0", 10);
  const pageId = parseInt(params.pageId ?? "0", 10);

  const { data: menu, isLoading, isError } = api.menu.getById.useQuery(
    { menuId },
    { enabled: menuId > 0 },
  );

  const updateAnnotations = api.menu.updateAnnotations.useMutation();
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef<PriceAnnotation[]>([]);

  const page = menu?.pages.find((p) => p.id === pageId) ?? null;
  const pageIndex = menu?.pages.findIndex((p) => p.id === pageId) ?? -1;
  const prevPage = pageIndex > 0 ? menu?.pages[pageIndex - 1] : null;
  const nextPage = pageIndex >= 0 && menu?.pages[pageIndex + 1] ? menu.pages[pageIndex + 1] : null;

  const handleSave = useCallback(
    (annotations: PriceAnnotation[]) => {
      if (!page) return;
      setIsSaving(true);
      updateAnnotations.mutate(
        { pageId: page.id, annotations },
        {
          onSettled: () => setIsSaving(false),
          onSuccess: () => {
            lastSavedRef.current = annotations;
          },
        },
      );
    },
    [page, updateAnnotations],
  );

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !menu) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
        <p>Menú no encontrado</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
        <p>Página no encontrada</p>
        <Link href={`/dashboard/menus/${menuId}`}>
          <Button variant="secondary">Volver al menú</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/menus" className="hover:text-gray-700">
          Mis menús
        </Link>
        <span>/</span>
        <Link href={`/dashboard/menus/${menuId}`} className="hover:text-gray-700">
          {menu.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Página {page.pageNumber}</span>
      </div>

      {/* Instrucción */}
      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <strong>Editor de precios</strong> — Seleccioná&nbsp;
        <span className="font-medium">Agregar precio</span>, hacé click sobre la imagen
        donde querés el precio y editá el texto. Podés arrastrar las etiquetas para
        reposicionarlas. Los cambios se guardan automáticamente.
      </div>

      {/* Editor */}
      <PriceEditor
        imageUrl={page.imageUrl}
        initialAnnotations={page.annotations ?? []}
        onSave={handleSave}
        isSaving={isSaving}
        pageLabel={`Página ${page.pageNumber} de ${menu.pages.length}`}
      />

      {/* Navegación entre páginas */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {prevPage ? (
            <Link href={`/dashboard/menus/${menuId}/pagina/${prevPage.id}`}>
              <Button variant="secondary" size="sm">
                ← Página {prevPage.pageNumber}
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <Link href={`/dashboard/menus/${menuId}`}>
          <Button variant="ghost" size="sm">
            Volver al menú
          </Button>
        </Link>

        <div>
          {nextPage ? (
            <Link href={`/dashboard/menus/${menuId}/pagina/${nextPage.id}`}>
              <Button variant="secondary" size="sm">
                Página {nextPage.pageNumber} →
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
