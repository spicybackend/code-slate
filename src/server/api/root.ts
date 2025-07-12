import { challengeRouter } from "~/server/api/routers/challenge";
import { organizationRouter } from "~/server/api/routers/organization";
import { submissionRouter } from "~/server/api/routers/submission";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  challenge: challengeRouter,
  submission: submissionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.organization.getCurrent();
 *       ^? Organization | null
 */
export const createCaller = createCallerFactory(appRouter);
