"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FileUploader } from "~/components/menu/file-uploader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export default function EditMenuPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const menuId = parseInt(params.id ?? "0", 10);

  const {
    data: menu,
    isLoading,
    isError,
    refetch,
  } = api.menu.getById.useQuery({ menuId }, { enabled: menuId > 0 });

  const publishMutation = api.menu.publish.useMutation({
    onSuccess: () => void refetch(),
  });
  const unpublishMutation = api.menu.unpublish.useMutation({
    onSuccess: () => void refetch(),
  });
  const updateTitleMutation = api.menu.updateTitle.useMutation({
    onSuccess: () => {
      setEditingTitle(false);
      void refetch();
    },
  });

  const qrQuery = api.menu.getQR.useQuery(
    { menuId },
    { enabled: menuId > 0 && menu?.isPublished === true },
  );

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showQR, setShowQR] = useState(false);

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
        <Link href="/dashboard/menus">
          <Button variant="secondary">Volver a mis menús</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/menus" className="hover:text-gray-700">
          Mis menús
        </Link>
        <span>/</span>
        <span className="text-gray-900">{menu.title}</span>
      </div>

      {/* Header con título editable */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          {editingTitle ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (titleDraft.trim()) {
                  updateTitleMutation.mutate({ menuId, title: titleDraft.trim() });
                }
              }}
            >
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
                className="text-2xl font-bold"
              />
              <Button type="submit" size="sm" isLoading={updateTitleMutation.isPending}>
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingTitle(false)}
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{menu.title}</h1>
              <button
                onClick={() => {
                  setTitleDraft(menu.title);
                  setEditingTitle(true);
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Editar título"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Estado y URL */}
          <div className="flex items-center gap-3 text-sm">
            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs font-medium",
                menu.isPublished
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500",
              ].join(" ")}
            >
              {menu.isPublished ? "Publicado" : "Borrador"}
            </span>
            {menu.isPublished && (
              <a
                href={`/m/${menu.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs"
              >
                /m/{menu.slug} ↗
              </a>
            )}
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap gap-2">
          {menu.isPublished ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowQR((v) => !v)}
              >
                {showQR ? "Ocultar QR" : "Ver QR"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                isLoading={unpublishMutation.isPending}
                onClick={() => unpublishMutation.mutate({ menuId })}
              >
                Despublicar
              </Button>
            </>
          ) : (
            <Button
              disabled={menu.pages.length === 0}
              title={menu.pages.length === 0 ? "Subí al menos una página primero" : undefined}
              isLoading={publishMutation.isPending}
              onClick={() => publishMutation.mutate({ menuId })}
            >
              Publicar menú
            </Button>
          )}
        </div>
      </div>

      {/* QR Code */}
      {showQR && qrQuery.data && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="font-medium text-gray-700">Código QR del menú</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrQuery.data.qrDataUrl}
            alt="QR del menú"
            className="h-48 w-48"
          />
          <p className="text-xs text-gray-400">{qrQuery.data.menuUrl}</p>
          <a
            href={qrQuery.data.qrDataUrl}
            download={`qr-${menu.slug}.png`}
          >
            <Button variant="secondary" size="sm">
              Descargar QR
            </Button>
          </a>
        </div>
      )}

      {/* Páginas actuales */}
      {menu.pages.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-semibold text-gray-700">
            Páginas actuales ({menu.pages.length})
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {menu.pages.map((page) => (
              <div key={page.id} className="flex flex-col items-center gap-1.5">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.imageUrl}
                    alt={`Página ${page.pageNumber}`}
                    className="h-full w-full object-cover"
                  />
                  {/* Badge de anotaciones */}
                  {Array.isArray(page.annotations) && page.annotations.length > 0 && (
                    <div className="absolute right-1 top-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-bold text-white leading-none">
                      {page.annotations.length}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400">Pág. {page.pageNumber}</span>
                <Link
                  href={`/dashboard/menus/${menuId}/pagina/${page.id}`}
                  className="w-full"
                >
                  <Button variant="secondary" size="sm" className="w-full text-xs">
                    Editar precios
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploader para agregar más páginas */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700">
          {menu.pages.length === 0 ? "Subir páginas" : "Agregar más páginas"}
        </h2>

        <FileUploader
          menuId={menuId}
          initialPages={menu.pages.map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl,
          }))}
          onUploadComplete={() => void refetch()}
        />
      </div>

      {/* Aviso sobre editor de precios */}
      <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
        <strong>Próximamente:</strong> Editor de precios — podrás superponer etiquetas
        de precio sobre las imágenes del menú.
      </div>
    </div>
  );
}
