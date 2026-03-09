import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Cliente SERVER-SIDE con service role key.
 * Tiene permisos completos (bypass RLS). Usar solo en server actions / API routes.
 * NUNCA exponer al cliente.
 */
export function createAdminClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas en el servidor",
    );
  }

  return createClient(url, key, {
    auth: {
      // En el servidor no necesitamos sesión de usuario de Supabase Auth —
      // usamos NextAuth. Solo usamos Supabase como storage.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cliente CLIENT-SIDE con anon key (publishable).
 * Sujeto a las políticas RLS del bucket.
 * Se puede usar en componentes client para uploads directos.
 */
export function createBrowserClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas",
    );
  }

  return createClient(url, key);
}

/**
 * Nombre del bucket de Storage según el entorno.
 * - development/test → MENUS_BUCKET_DEV
 * - production       → MENUS_BUCKET
 *
 * Esto evita que datos de prueba contaminen el bucket de producción.
 */
export const MENUS_BUCKET =
  process.env.NODE_ENV === "production" ? "MENUS_BUCKET" : "MENUS_BUCKET_DEV";

/**
 * Construye el path de un archivo en el bucket.
 * Estructura: {userId}/original/{menuId}/{fileName}
 */
export function buildStoragePath(
  userId: string,
  menuId: number,
  fileName: string,
): string {
  return `${userId}/original/${menuId}/${fileName}`;
}

/**
 * Retorna la URL pública de un archivo en el bucket `menus`.
 */
export function getPublicUrl(supabaseUrl: string, filePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${MENUS_BUCKET}/${filePath}`;
}
