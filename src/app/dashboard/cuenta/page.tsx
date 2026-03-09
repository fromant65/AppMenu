import { eq } from "drizzle-orm";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export default async function CuentaPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = userId
    ? await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          name: true,
          email: true,
          businessName: true,
          businessSlug: true,
          subscriptionStatus: true,
          subscriptionExpiry: true,
        },
      })
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Días restantes en trial
  let trialDaysLeft: number | null = null;
  if (
    user?.subscriptionStatus === "trial" &&
    user.subscriptionExpiry !== null
  ) {
    const ms = user.subscriptionExpiry.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  const statusLabel =
    user?.subscriptionStatus === "active"
      ? "Activa"
      : user?.subscriptionStatus === "trial"
        ? "Período de prueba"
        : "Inactiva";

  const statusColor =
    user?.subscriptionStatus === "active"
      ? "bg-green-100 text-green-700 border-green-200"
      : user?.subscriptionStatus === "trial"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-red-100 text-red-600 border-red-200";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Mi cuenta</h1>

      {/* Datos del perfil */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Perfil
        </h2>
        <dl className="space-y-3">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-36 flex-shrink-0 text-sm text-gray-500">Nombre</dt>
            <dd className="text-sm font-medium text-gray-900">
              {user?.name ?? "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-36 flex-shrink-0 text-sm text-gray-500">Email</dt>
            <dd className="text-sm font-medium text-gray-900">
              {user?.email ?? "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-36 flex-shrink-0 text-sm text-gray-500">
              Negocio
            </dt>
            <dd className="text-sm font-medium text-gray-900">
              {user?.businessName ?? "—"}
            </dd>
          </div>
          {user?.businessSlug && (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-4">
              <dt className="w-36 flex-shrink-0 text-sm text-gray-500">
                Link público
              </dt>
              <dd className="text-sm font-medium text-blue-600 break-all">
                <a
                  href={`${appUrl}/m/${user.businessSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {appUrl}/m/{user.businessSlug}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Suscripción */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Suscripción
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusColor}`}
            >
              {statusLabel}
            </span>
            {user?.subscriptionStatus === "trial" && trialDaysLeft !== null && (
              <span className="text-sm text-gray-500">
                {trialDaysLeft === 0
                  ? "Vence hoy"
                  : `Vence en ${trialDaysLeft} día${trialDaysLeft === 1 ? "" : "s"}`}
              </span>
            )}
          </div>

          {user?.subscriptionExpiry && (
            <p className="text-xs text-gray-400">
              {user.subscriptionStatus === "active"
                ? "Próxima renovación:"
                : "Vencimiento:"}{" "}
              {user.subscriptionExpiry.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </section>

      {/* Pagos — próximamente */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-sm font-semibold text-gray-600">
          Pagos y facturación — próximamente
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Pronto podrás gestionar tu suscripción y realizar pagos directamente
          desde aquí mediante Mercado Pago.
        </p>
      </section>
    </div>
  );
}
