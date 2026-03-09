"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUploader } from "~/components/menu/file-uploader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

type Step = "form" | "upload" | "done";

export default function NuevoMenuPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [createdMenu, setCreatedMenu] = useState<{ id: number; slug: string } | null>(null);

  const { data: existingMenus, isLoading: checkingMenus } = api.menu.list.useQuery();
  const hasMenu = (existingMenus?.length ?? 0) >= 1;

  const createMenu = api.menu.create.useMutation({
    onSuccess: (menu) => {
      setCreatedMenu(menu);
      setStep("upload");
    },
    onError: (err) => {
      setTitleError(err.message);
    },
  });

  // ── Paso 1: Crear menú ──────────────────────────────────────────────────

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setTitleError("");

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("El título es requerido");
      return;
    }

    createMenu.mutate({ title: trimmed });
  }

  // ── Paso 2: Subida completada ────────────────────────────────────────────

  function handleUploadComplete() {
    setStep("done");
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  if (checkingMenus) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Ya tiene un menú: bloquear la creación
  if (hasMenu && step === "form") {
    const menu = existingMenus![0]!;
    return (
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => router.push("/dashboard/menus")}
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a mis menús
        </button>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">Ya tenés un menú creado</h2>
          <p className="mb-6 text-sm text-gray-600">
            Por ahora cada cuenta puede tener <strong>un solo menú</strong>.
            Pronto vamos a ampliar esta funcionalidad para que puedas tener más.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button onClick={() => router.push(`/dashboard/menus/${menu.id}`)}>
              Editar mi menú actual
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/menus")}>
              Ver mis menús
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/menus")}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver a mis menús
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Nuevo menú</h1>
        <p className="mt-1 text-sm text-gray-500">
          Subí las páginas de tu menú en PDF o imágenes
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-3">
        {(["form", "upload", "done"] as Step[]).map((s, idx) => {
          const labels = ["1. Nombre", "2. Páginas", "3. Listo"];
          const isActive = step === s;
          const isDone =
            (s === "form" && (step === "upload" || step === "done")) ||
            (s === "upload" && step === "done");

          return (
            <div key={s} className="flex items-center gap-3">
              {idx > 0 && (
                <div
                  className={`h-0.5 w-8 ${isDone ? "bg-blue-500" : "bg-gray-200"}`}
                />
              )}
              <div
                className={[
                  "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDone
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400",
                ].join(" ")}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
                {labels[idx]}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Paso 1: Nombre ─────────────────────────────────────────────── */}
      {step === "form" && (
        <form onSubmit={handleCreate} className="flex flex-col gap-6">
          <Input
            label="Nombre del menú"
            placeholder="Ej: Carta Principal, Menú de verano..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={titleError}
            hint="Este nombre es solo para vos. Lo podés cambiar después."
            autoFocus
          />

          <Button
            type="submit"
            isLoading={createMenu.isPending}
            className="self-start"
          >
            Crear y subir páginas →
          </Button>
        </form>
      )}

      {/* ─── Paso 2: Subida de páginas ───────────────────────────────────── */}
      {step === "upload" && createdMenu && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <strong>Menú creado:</strong> {title}. Ahora subí las páginas (PDF o imágenes).
          </div>

          <FileUploader
            menuId={createdMenu.id}
            onUploadComplete={handleUploadComplete}
          />

          <button
            onClick={() => setStep("done")}
            className="text-sm text-gray-400 hover:text-gray-600 self-center"
          >
            Saltear por ahora
          </button>
        </div>
      )}

      {/* ─── Paso 3: Listo ───────────────────────────────────────────────── */}
      {step === "done" && createdMenu && (
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-green-50 p-10 text-center">
          <div className="rounded-full bg-green-100 p-4">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">¡Menú creado!</h2>
            <p className="mt-2 text-gray-600">
              Tu menú <strong>{title}</strong> ya está listo para editar.
              Cuando quieras, podés publicarlo para compartirlo por QR.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => router.push(`/dashboard/menus/${createdMenu.id}`)}>
              Editar menú
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/dashboard/menus")}
            >
              Ver todos mis menús
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
