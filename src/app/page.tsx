import Link from "next/link";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container flex flex-col items-center gap-12 px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            App<span className="text-blue-400">Menu</span>
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Cartas digitales con precios actualizados para tu negocio
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-8 py-3 font-semibold transition hover:bg-blue-700"
            >
              Ir al dashboard
            </Link>
          ) : (
            <div className="flex gap-4">
              <Link
                href="/registro"
                className="rounded-xl bg-blue-600 px-8 py-3 font-semibold transition hover:bg-blue-700"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-600 px-8 py-3 font-semibold transition hover:border-slate-400"
              >
                Iniciar sesion
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
