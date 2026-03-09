import Link from "next/link";
import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "usuario";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenido, {userName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestioná las cartas digitales de tu negocio desde acá.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/menus/nuevo"
          className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50 p-5 transition hover:border-blue-200 hover:bg-blue-100"
        >
          <span className="text-2xl">+</span>
          <span className="font-medium text-blue-900">Crear nuevo menú</span>
          <span className="text-sm text-blue-700">
            Subí tu carta y agregá los precios
          </span>
        </Link>

        <Link
          href="/dashboard/menus"
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300"
        >
          <span className="text-2xl">☰</span>
          <span className="font-medium text-gray-900">Mis menús</span>
          <span className="text-sm text-gray-500">
            Ver y editar tus cartas existentes
          </span>
        </Link>

        <Link
          href="/dashboard/cuenta"
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300"
        >
          <span className="text-2xl">◎</span>
          <span className="font-medium text-gray-900">Mi cuenta</span>
          <span className="text-sm text-gray-500">
            Suscripción y datos del negocio
          </span>
        </Link>
      </div>
    </div>
  );
}
