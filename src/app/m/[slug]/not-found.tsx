import Link from "next/link";

export default function MenuNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gray-950 px-4 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-800">
        <svg
          className="h-10 w-10 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Menú no encontrado</h1>
        <p className="mt-2 text-gray-400">
          Este menú no existe, fue dado de baja o todavía no fue publicado.
        </p>
      </div>

      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
