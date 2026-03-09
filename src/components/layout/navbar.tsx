import { signOut } from "~/server/auth";
import { auth } from "~/server/auth";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb / título — se puede extender por página */}
      <div />

      {/* Usuario + logout */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {session?.user?.name ?? session?.user?.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
