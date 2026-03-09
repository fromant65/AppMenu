import { auth } from "~/server/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Solo ejecutar en rutas que realmente necesitan protección
  // Excluir: archivos estáticos, API (se protegen individualmente en tRPC)
  matcher: ["/dashboard/:path*"],
};
