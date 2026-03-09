"use client";

import Link from "next/link";

export default function MenuError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gray-950 px-4 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-800">
        <svg
          className="h-10 w-10 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-gray-400">
          No se pudo cargar este menú. Por favor, intentá de nuevo.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
        >
          Inicio
        </Link>
      </div>
    </div>
  );
}
