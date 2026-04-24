import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { UserRole } from "@repo/shared/db/schema";
import { getSessionFromCookies } from "./auth/session";

export interface TRPCContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const result = await getSessionFromCookies();

  if (!result) {
    return { user: null };
  }

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    },
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAdmin);
export const createCallerFactory = t.createCallerFactory;
