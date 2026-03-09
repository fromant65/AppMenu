"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type PriceAnnotation } from "~/types/menu";
import { Button } from "~/components/ui/button";

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEFAULT_FONT_SIZE = 18;
const DEFAULT_COLOR = "#ffffff";
const DEFAULT_FONT_WEIGHT: PriceAnnotation["fontWeight"] = "bold";
const AUTOSAVE_DELAY_MS = 1200;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newAnnotation(x: number, y: number): PriceAnnotation {
  return {
    id: crypto.randomUUID(),
    x,
    y,
    text: "$",
    fontSize: DEFAULT_FONT_SIZE,
    color: DEFAULT_COLOR,
    fontWeight: DEFAULT_FONT_WEIGHT,
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PriceEditorProps {
  imageUrl: string;
  initialAnnotations: PriceAnnotation[];
  /** Se llama cada vez que las anotaciones cambian (para auto-guardado) */
  onSave: (annotations: PriceAnnotation[]) => void;
  /** Estado del guardado para mostrar feedback */
  isSaving?: boolean;
  pageLabel?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PriceEditor({
  imageUrl,
  initialAnnotations,
  onSave,
  isSaving = false,
  pageLabel,
}: PriceEditorProps) {
  const [annotations, setAnnotations] = useState<PriceAnnotation[]>(initialAnnotations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [editingText, setEditingText] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Drag state ──────────────────────────────────────────────────────────
  const dragRef = useRef<{
    id: string;
    startPx: number;
    startPy: number;
    origX: number;
    origY: number;
  } | null>(null);

  // ── Auto-guardado con debounce ──────────────────────────────────────────

  const scheduleAutosave = useCallback(
    (updated: PriceAnnotation[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onSave(updated);
      }, AUTOSAVE_DELAY_MS);
    },
    [onSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Actualizar anotación ────────────────────────────────────────────────

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<PriceAnnotation>) => {
      setAnnotations((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
        scheduleAutosave(next);
        return next;
      });
    },
    [scheduleAutosave],
  );

  // ── Agregar anotación (click en el contenedor) ──────────────────────────

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    // Si no estamos en modo agregar, deseleccionar al hacer click en el fondo
    if (!addMode) {
      setSelectedId(null);
      setEditingText(false);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const annotation = newAnnotation(
      Math.max(0.01, Math.min(0.99, x)),
      Math.max(0.01, Math.min(0.99, y)),
    );

    setAnnotations((prev) => {
      const next = [...prev, annotation];
      scheduleAutosave(next);
      return next;
    });
    setSelectedId(annotation.id);
    setEditingText(true); // Abrir edición inmediatamente
    setAddMode(false);
  }

  // ── Eliminar anotación ──────────────────────────────────────────────────

  function deleteAnnotation(id: string) {
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      scheduleAutosave(next);
      return next;
    });
    setSelectedId(null);
    setEditingText(false);
  }

  // ── Drag: inicio ────────────────────────────────────────────────────────

  function handleAnnotationPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    annotation: PriceAnnotation,
  ) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    setSelectedId(annotation.id);
    setEditingText(false);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      id: annotation.id,
      startPx: e.clientX,
      startPy: e.clientY,
      origX: annotation.x,
      origY: annotation.y,
    };
  }

  // ── Drag: movimiento ────────────────────────────────────────────────────

  function handleAnnotationPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = (e.clientX - dragRef.current.startPx) / rect.width;
    const dy = (e.clientY - dragRef.current.startPy) / rect.height;

    const newX = Math.max(0.01, Math.min(0.99, dragRef.current.origX + dx));
    const newY = Math.max(0.01, Math.min(0.99, dragRef.current.origY + dy));

    updateAnnotation(dragRef.current.id, { x: newX, y: newY });
  }

  // ── Drag: fin ───────────────────────────────────────────────────────────

  function handleAnnotationPointerUp() {
    dragRef.current = null;
  }

  // ── Anotación seleccionada ──────────────────────────────────────────────

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      {/* Barra de herramientas superior */}
      <div className="flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 py-2.5">
        {/* Etiqueta de página */}
        {pageLabel && (
          <span className="mr-2 text-sm font-medium text-gray-600">{pageLabel}</span>
        )}

        {/* Modo "agregar anotación" */}
        <Button
          size="sm"
          variant={addMode ? "primary" : "secondary"}
          onClick={() => {
            setAddMode((v) => !v);
            setSelectedId(null);
            setEditingText(false);
          }}
          title="Hacé click en la imagen para agregar un precio"
        >
          {addMode ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar precio
            </>
          )}
        </Button>

        {/* Separador */}
        {selected && <div className="mx-1 h-5 w-px bg-gray-200" />}

        {/* Controles de la anotación seleccionada */}
        {selected && (
          <>
            {/* Texto */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Texto</label>
              <input
                type="text"
                value={selected.text}
                autoFocus={editingText}
                onChange={(e) => updateAnnotation(selected.id, { text: e.target.value })}
                className="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="$1.500"
              />
            </div>

            {/* Tamaño */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Tamaño</label>
              <input
                type="number"
                min={10}
                max={72}
                value={selected.fontSize}
                onChange={(e) =>
                  updateAnnotation(selected.id, {
                    fontSize: Math.max(10, Math.min(72, parseInt(e.target.value) || DEFAULT_FONT_SIZE)),
                  })
                }
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Color</label>
              <input
                type="color"
                value={selected.color}
                onChange={(e) => updateAnnotation(selected.id, { color: e.target.value })}
                className="h-7 w-8 cursor-pointer rounded border border-gray-300 p-0.5"
                title="Color del texto"
              />
            </div>

            {/* Negrita */}
            <button
              onClick={() =>
                updateAnnotation(selected.id, {
                  fontWeight: selected.fontWeight === "bold" ? "normal" : "bold",
                })
              }
              className={[
                "flex h-7 w-7 items-center justify-center rounded border font-bold text-sm transition-colors",
                selected.fontWeight === "bold"
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
              ].join(" ")}
              title="Negrita"
            >
              N
            </button>

            {/* Sombra toggle (shadow = "text-shadow" via class) */}
            {/* Eliminar */}
            <Button
              size="sm"
              variant="danger"
              onClick={() => deleteAnnotation(selected.id)}
              title="Eliminar anotación"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </Button>
          </>
        )}

        {/* Espaciador + estado de guardado */}
        <div className="ml-auto flex items-center gap-2">
          {isSaving ? (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </span>
          ) : annotations !== initialAnnotations ? (
            <span className="text-xs text-green-600">✓ Guardado</span>
          ) : null}
          <span className="text-xs text-gray-400">{annotations.length} anotación{annotations.length !== 1 ? "es" : ""}</span>
        </div>
      </div>

      {/* Zona de la imagen + anotaciones */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={[
          "relative select-none overflow-hidden rounded-b-xl border border-gray-200 bg-gray-900",
          addMode ? "cursor-crosshair" : "cursor-default",
        ].join(" ")}
        style={{ touchAction: "none" }}
      >
        {/* Imagen del menú */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Página del menú"
          draggable={false}
          className="pointer-events-none block w-full"
        />

        {/* Anotaciones superpuestas */}
        {annotations.map((annotation) => (
          <AnnotationNode
            key={annotation.id}
            annotation={annotation}
            isSelected={annotation.id === selectedId}
            onPointerDown={handleAnnotationPointerDown}
            onPointerMove={handleAnnotationPointerMove}
            onPointerUp={handleAnnotationPointerUp}
          />
        ))}

        {/* Hint modo agregar */}
        {addMode && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              Hacé click donde querés colocar el precio
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nodo de anotación ────────────────────────────────────────────────────────

interface AnnotationNodeProps {
  annotation: PriceAnnotation;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, a: PriceAnnotation) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function AnnotationNode({
  annotation,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: AnnotationNodeProps) {
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, annotation)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => e.stopPropagation()}
      className={[
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded px-1.5 py-0.5 active:cursor-grabbing",
        isSelected ? "ring-2 ring-blue-400 ring-offset-1" : "",
      ].join(" ")}
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
        touchAction: "none",
        // Sombra de texto para legibilidad sobre cualquier fondo
        textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)",
      }}
    >
      <span
        style={{
          fontSize: `${annotation.fontSize}px`,
          color: annotation.color,
          fontWeight: annotation.fontWeight,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        {annotation.text || "…"}
      </span>
    </div>
  );
}
