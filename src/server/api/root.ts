import { authRouter } from "~/server/api/routers/auth";
import { menuRouter } from "~/server/api/routers/menu";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * Registro de todos los routers de la app.
 * Agregar cada nuevo router aqui al crearlo.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  menu: menuRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
