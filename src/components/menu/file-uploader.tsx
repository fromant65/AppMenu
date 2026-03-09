"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { pdfToImages, uploadToSignedUrl } from "~/lib/pdf-to-images";
import { Button } from "~/components/ui/button";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface PageUploadState {
  pageNumber: number;
  fileName: string;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  progress?: string;
  imageUrl?: string;
  sizeBytes: number;
}

interface FileUploaderProps {
  menuId: number;
  /** Páginas ya subidas (para mostrar miniaturas existentes) */
  initialPages?: { pageNumber: number; imageUrl: string }[];
  onUploadComplete?: (pages: { pageNumber: number; imageUrl: string }[]) => void;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
/** Límite total de todos los archivos subidos (suma de páginas procesadas) */
const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Helpers ────────────────────────────────────────────────────────────────

function isAccepted(file: File) {
  return ACCEPTED_TYPES.includes(file.type);
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function FileUploader({
  menuId,
  initialPages = [],
  onUploadComplete,
}: FileUploaderProps) {
  const [pages, setPages] = useState<PageUploadState[]>(() =>
    initialPages.map((p) => ({
      pageNumber: p.pageNumber,
      fileName: `pagina-${String(p.pageNumber).padStart(3, "0")}.png`,
      previewUrl: p.imageUrl,
      status: "done" as const,
      imageUrl: p.imageUrl,
      sizeBytes: 0, // tamaño desconocido para páginas ya subidas
    })),
  );

  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrl = api.menu.getUploadUrl.useMutation();
  const confirmUpload = api.menu.confirmUpload.useMutation();

  // ── Procesar archivos seleccionados ──────────────────────────────────────

  const processFiles = useCallback(
    async (files: File[]) => {
      setGlobalError(null);

      // Validaciones básicas: tipo de archivo
      const validFiles = files.filter((f) => {
        if (!isAccepted(f)) {
          setGlobalError(`Tipo de archivo no soportado: ${f.name}`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      // Validación de tamaño total acumulado (páginas nuevas)
      const currentNewBytes = pages
        .filter((p) => p.sizeBytes > 0)
        .reduce((sum, p) => sum + p.sizeBytes, 0);
      const incomingBytes = validFiles.reduce((sum, f) => sum + f.size, 0);
      if (currentNewBytes + incomingBytes > MAX_TOTAL_SIZE_BYTES) {
        const remaining = MAX_TOTAL_SIZE_BYTES - currentNewBytes;
        setGlobalError(
          `Los archivos seleccionados (${formatSize(incomingBytes)}) superan el espacio disponible (${formatSize(remaining)} restantes de ${formatSize(MAX_TOTAL_SIZE_BYTES)} totales).`,
        );
        return;
      }

      setIsProcessing(true);

      try {
        // Determinar el próximo número de página basado en las existentes
        let nextPage =
          pages.filter((p) => p.status === "done").reduce((max, p) => Math.max(max, p.pageNumber), 0) + 1;

        for (const file of validFiles) {
          if (file.type === "application/pdf") {
            // PDF → convertir cada página a PNG
            const pdfPages = await pdfToImages(
              file,
              2,
              (current, total) => {
                setGlobalError(null);
                // Feedback visual durante la conversión
                console.log(`Convirtiendo PDF: página ${current}/${total}`);
              },
            );

            for (const pdfPage of pdfPages) {
              const pageNumber = nextPage++;
              const previewUrl = URL.createObjectURL(pdfPage.blob);

              // Agregar al estado como "uploading"
              setPages((prev) => [
                ...prev,
                {
                  pageNumber,
                  fileName: pdfPage.fileName,
                  previewUrl,
                  status: "uploading",
                  progress: "Subiendo...",
                  sizeBytes: pdfPage.blob.size,
                },
              ]);

              await uploadPage(pageNumber, pdfPage.fileName, pdfPage.blob, previewUrl);
            }
          } else {
            // Imagen directa
            const pageNumber = nextPage++;
            const previewUrl = URL.createObjectURL(file);

            setPages((prev) => [
              ...prev,
              {
                pageNumber,
                fileName: file.name,
                previewUrl,
                status: "uploading",
                progress: "Subiendo...",
                sizeBytes: file.size,
              },
            ]);

            await uploadPage(pageNumber, file.name, file, previewUrl);
          }
        }
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : "Error al procesar archivos");
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages],
  );

  // ── Subir una página individual ──────────────────────────────────────────

  async function uploadPage(
    pageNumber: number,
    fileName: string,
    blob: Blob,
    _previewUrl: string,
  ) {
    try {
      // 1. Pedir URL firmada al servidor
      const { signedUrl, path } = await getUploadUrl.mutateAsync({
        menuId,
        fileName,
        pageNumber,
      });

      // 2. Subir directamente a Supabase
      const ok = await uploadToSignedUrl(signedUrl, blob, blob.type || "image/png");
      if (!ok) throw new Error("Error de red al subir la imagen");

      // 3. Confirmar en la base de datos
      const { imageUrl } = await confirmUpload.mutateAsync({
        menuId,
        pageNumber,
        storagePath: path,
      });

      // 4. Actualizar estado
      setPages((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, status: "done", imageUrl, progress: undefined }
            : p,
        ),
      );
    } catch (err) {
      setPages((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNumber
            ? {
                ...p,
                status: "error",
                progress: err instanceof Error ? err.message : "Error",
              }
            : p,
        ),
      );
    }
  }

  // ── Eventos de drag & drop ───────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    void processFiles(files);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    void processFiles(files);
    // Limpiar el input para que se pueda volver a seleccionar el mismo archivo
    e.target.value = "";
  }

  // ── Calcular totales de peso ─────────────────────────────────────────────

  const totalNewBytes = pages
    .filter((p) => p.sizeBytes > 0)
    .reduce((sum, p) => sum + p.sizeBytes, 0);
  const totalPct = Math.min(100, Math.round((totalNewBytes / MAX_TOTAL_SIZE_BYTES) * 100));

  // ── Notificar cuando todas las páginas están subidas ────────────────────

  const donwPages = pages.filter((p) => p.status === "done" && p.imageUrl);
  const hasUploading = pages.some((p) => p.status === "uploading");

  function handleDone() {
    onUploadComplete?.(
      donwPages.map((p) => ({ pageNumber: p.pageNumber, imageUrl: p.imageUrl! })),
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Zona de drag & drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        aria-label="Zona de subida de archivos"
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
          isProcessing ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <svg
          className={`h-10 w-10 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>

        <div className="text-center">
          <p className="font-medium text-gray-700">
            {isProcessing ? "Procesando..." : "Arrastrá archivos aquí o hacé click"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            PDF, PNG, JPG — máx. {formatSize(MAX_TOTAL_SIZE_BYTES)} en total
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Error global */}
      {globalError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{globalError}</p>
      )}

      {/* Barra de uso de espacio */}
      {totalNewBytes > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Espacio usado</span>
            <span
              className={totalPct >= 90 ? "font-semibold text-red-600" : ""}
            >
              {formatSize(totalNewBytes)} / {formatSize(MAX_TOTAL_SIZE_BYTES)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={[
                "h-full rounded-full transition-all",
                totalPct >= 90
                  ? "bg-red-500"
                  : totalPct >= 70
                    ? "bg-amber-400"
                    : "bg-blue-500",
              ].join(" ")}
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Miniaturas de páginas */}
      {pages.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Páginas ({pages.length})
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {pages
              .slice()
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((page) => (
                <div key={page.pageNumber} className="flex flex-col items-center gap-1">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.previewUrl}
                      alt={`Página ${page.pageNumber}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Overlay de estado */}
                    {page.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <svg
                          className="h-6 w-6 animate-spin text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      </div>
                    )}

                    {page.status === "done" && (
                      <div className="absolute right-1 top-1 rounded-full bg-green-500 p-0.5">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}

                    {page.status === "error" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/80">
                        <p className="px-1 text-center text-xs font-medium text-white">
                          Error
                        </p>
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-gray-500">Pág. {page.pageNumber}</span>
                  {page.sizeBytes > 0 && (
                    <span className="text-xs text-gray-400">{formatSize(page.sizeBytes)}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Botón de confirmar */}
      {donwPages.length > 0 && (
        <Button
          onClick={handleDone}
          disabled={hasUploading}
          className="mt-2 self-end"
        >
          Guardar {donwPages.length} página{donwPages.length !== 1 ? "s" : ""} ✓
        </Button>
      )}
    </div>
  );
}
