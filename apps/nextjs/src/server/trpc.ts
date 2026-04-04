import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getSessionFromCookies } from "./auth/session";

export interface TRPCContext {
  user: {
    id: string;
    name: string;
    email: string;
    language: string;
    currency: string;
    avatarUrl: string | null;
  } | null;
  sessionToken: string | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const result = await getSessionFromCookies();

  if (!result) {
    return { user: null, sessionToken: null };
  }

  return {
    user: result.user,
    sessionToken: result.session.token,
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
      sessionToken: ctx.sessionToken!,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const createCallerFactory = t.createCallerFactory;
