import { router } from "../trpc";

/**
 * Root router - combine all sub-routers here
 *
 * Example:
 *   import { userRouter } from "./user";
 *   export const appRouter = router({ user: userRouter });
 */
export const appRouter = router({});

export type AppRouter = typeof appRouter;
