"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

// ─── Utility ────────────────────────────────────────────────────────────────

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function MenusPage() {
  const { data: menus, isLoading, isError, refetch } = api.menu.list.useQuery();

  const publishMutation = api.menu.publish.useMutation({
    onSuccess: () => void refetch(),
  });
  const unpublishMutation = api.menu.unpublish.useMutation({
    onSuccess: () => void refetch(),
  });
  const deleteMutation = api.menu.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
        <p>Error al cargar los menús</p>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis menús</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administrá tus menús digitales
          </p>
        </div>
        <Link href="/dashboard/menus/nuevo">
          <Button>+ Nuevo menú</Button>
        </Link>
      </div>

      {/* Estado vacío */}
      {menus?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-700">No tenés menús todavía</p>
            <p className="mt-1 text-sm text-gray-500">
              Creá tu primer menú digital y compartilo con un código QR
            </p>
          </div>
          <Link href="/dashboard/menus/nuevo">
            <Button>Crear primer menú</Button>
          </Link>
        </div>
      )}

      {/* Lista de menús */}
      {(menus?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3">
          {menus!.map((menu) => (
            <div
              key={menu.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Info */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{menu.title}</h2>
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
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{menu.pages.length} página{menu.pages.length !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>Creado {formatDate(menu.createdAt)}</span>
                  {menu.isPublished && (
                    <>
                      <span>·</span>
                      <a
                        href={`/m/${menu.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Ver público ↗
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/dashboard/menus/${menu.id}`}>
                  <Button variant="secondary" size="sm">
                    Editar
                  </Button>
                </Link>

                {menu.isPublished ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={unpublishMutation.isPending && unpublishMutation.variables?.menuId === menu.id}
                    onClick={() =>
                      unpublishMutation.mutate({ menuId: menu.id })
                    }
                  >
                    Despublicar
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={publishMutation.isPending && publishMutation.variables?.menuId === menu.id}
                    disabled={menu.pages.length === 0}
                    title={menu.pages.length === 0 ? "Subí al menos una página primero" : undefined}
                    onClick={() =>
                      publishMutation.mutate({ menuId: menu.id })
                    }
                  >
                    Publicar
                  </Button>
                )}

                {/* Confirmación de eliminación */}
                {deletingId === menu.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">¿Confirmar?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      isLoading={deleteMutation.isPending}
                      onClick={() => {
                        deleteMutation.mutate(
                          { menuId: menu.id },
                          { onSettled: () => setDeletingId(null) },
                        );
                      }}
                    >
                      Sí, eliminar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(menu.id)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
