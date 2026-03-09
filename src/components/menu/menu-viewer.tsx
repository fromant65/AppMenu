"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type PriceAnnotation } from "~/types/menu";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MenuPage {
  id: number;
  pageNumber: number;
  imageUrl: string;
  annotations: unknown; // viene como JSON de la DB — lo casteamos
}

interface MenuViewerProps {
  businessName: string;
  menuTitle: string;
  pages: MenuPage[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MenuViewer({ businessName, menuTitle, pages }: MenuViewerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  // ── Navegación por teclado ──────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentIdx((i) => Math.min(i + 1, pages.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentIdx((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  // ── Swipe táctil ────────────────────────────────────────────────────────

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;

    // Solo swipe horizontal si es predominante
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) {
        setCurrentIdx((i) => Math.min(i + 1, pages.length - 1));
      } else {
        setCurrentIdx((i) => Math.max(i - 1, 0));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, pages.length - 1)));
  }, [pages.length]);

  const page = pages[currentIdx];
  if (!page) return null;

  const annotations = (page.annotations as PriceAnnotation[] | null) ?? [];

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {businessName}
          </p>
          <h1 className="text-sm font-semibold text-white leading-tight">{menuTitle}</h1>
        </div>

        {/* Indicador de página */}
        {pages.length > 1 && (
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
            {currentIdx + 1} / {pages.length}
          </span>
        )}
      </header>

      {/* Imagen principal */}
      <main
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full max-w-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={page.id}
            src={page.imageUrl}
            alt={`Página ${page.pageNumber} del menú`}
            className="w-full block"
            draggable={false}
          />

          {/* Anotaciones de precio superpuestas (solo lectura) */}
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded"
              style={{
                left: `${ann.x * 100}%`,
                top: `${ann.y * 100}%`,
                textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)",
              }}
            >
              <span
                style={{
                  fontSize: `${ann.fontSize}px`,
                  color: ann.color,
                  fontWeight: ann.fontWeight,
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                {ann.text}
              </span>
            </div>
          ))}
        </div>

        {/* Flechas de navegación (desktop) */}
        {pages.length > 1 && (
          <>
            <button
              onClick={() => goTo(currentIdx - 1)}
              disabled={currentIdx === 0}
              aria-label="Página anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed sm:h-12 sm:w-12"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goTo(currentIdx + 1)}
              disabled={currentIdx === pages.length - 1}
              aria-label="Página siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed sm:h-12 sm:w-12"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </main>

      {/* Tira de miniaturas (si hay más de 1 página) */}
      {pages.length > 1 && (
        <nav
          aria-label="Páginas del menú"
          className="flex flex-shrink-0 items-center gap-2 overflow-x-auto px-4 py-3 bg-gray-900 border-t border-gray-800"
          style={{ scrollbarWidth: "none" }}
        >
          {pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => goTo(idx)}
              aria-label={`Ir a página ${p.pageNumber}`}
              aria-current={idx === currentIdx ? "true" : undefined}
              className={[
                "flex-shrink-0 overflow-hidden rounded border-2 transition-all",
                idx === currentIdx
                  ? "border-blue-400 opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80",
              ].join(" ")}
              style={{ width: 44, height: 58 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={`Miniatura pág. ${p.pageNumber}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </nav>
      )}

      {/* Dots (mobile, solo si pocas páginas) */}
      {pages.length > 1 && pages.length <= 12 && (
        <div className="flex flex-shrink-0 justify-center gap-1.5 py-2 bg-gray-950">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Página ${idx + 1}`}
              className={[
                "h-1.5 rounded-full transition-all",
                idx === currentIdx
                  ? "w-4 bg-blue-400"
                  : "w-1.5 bg-gray-600 hover:bg-gray-400",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      {/* Hint swipe (mobile) */}
      {pages.length > 1 && (
        <p className="flex-shrink-0 pb-safe pb-2 text-center text-xs text-gray-600">
          Deslizá para ver más páginas
        </p>
      )}
    </div>
  );
}
