import { initTRPC } from "@trpc/server";
import superjson from "superjson";

/**
 * tRPC Context - available in all procedures
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TRPCContext {
  // Extend with auth, db, etc. as needed
}

export function createTRPCContext(): TRPCContext {
  return {};
}

/**
 * tRPC Initialization
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

/**
 * Reusable exports
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
