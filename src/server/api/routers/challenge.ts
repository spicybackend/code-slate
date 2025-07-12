import { z } from "zod";
import { generateSecureToken } from "~/lib/crypto";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const challengeRouter = createTRPCRouter({
  // Get all challenges for organization
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).nullish(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      const challenges = await ctx.db.challenge.findMany({
        where: {
          organizationId: ctx.session.user.organizationId,
          ...(input.status && { status: input.status }),
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              candidates: true,
              submissions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });

      let nextCursor: typeof input.cursor | undefined;
      if (challenges.length > input.limit) {
        const nextItem = challenges.pop();
        nextCursor = nextItem?.id;
      }

      return {
        challenges,
        nextCursor,
      };
    }),

  // Get challenge by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          candidates: {
            include: {
              submissions: {
                select: {
                  id: true,
                  status: true,
                  submittedAt: true,
                  totalTimeSpent: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              candidates: true,
              submissions: true,
            },
          },
        },
      });

      if (
        !challenge ||
        challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Challenge not found");
      }

      return challenge;
    }),

  // Create new challenge
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        instructions: z.string().min(1),
        timeLimit: z.number().min(1).max(480).optional(), // Max 8 hours
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user can create challenges
      if (!["ADMIN", "HIRING_MANAGER"].includes(ctx.session.user.role)) {
        throw new Error(
          "Only admins and hiring managers can create challenges",
        );
      }

      return ctx.db.challenge.create({
        data: {
          ...input,
          organizationId: ctx.session.user.organizationId,
          creatorId: ctx.session.user.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }),

  // Update challenge
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().min(1).optional(),
        instructions: z.string().min(1).optional(),
        timeLimit: z.number().min(1).max(480).optional(),
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user can update challenges
      if (!["ADMIN", "HIRING_MANAGER"].includes(ctx.session.user.role)) {
        throw new Error(
          "Only admins and hiring managers can update challenges",
        );
      }

      const { id, ...updateData } = input;

      // Verify challenge belongs to organization
      const challenge = await ctx.db.challenge.findUnique({
        where: { id },
      });

      if (
        !challenge ||
        challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Challenge not found");
      }

      return ctx.db.challenge.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete challenge
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user can delete challenges (only admins)
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Only admins can delete challenges");
      }

      // Verify challenge belongs to organization
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.id },
      });

      if (
        !challenge ||
        challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Challenge not found");
      }

      return ctx.db.challenge.delete({
        where: { id: input.id },
      });
    }),

  // Add candidate to challenge
  addCandidate: protectedProcedure
    .input(
      z.object({
        challengeId: z.string(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        position: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user can add candidates
      if (!["ADMIN", "HIRING_MANAGER"].includes(ctx.session.user.role)) {
        throw new Error("Only admins and hiring managers can add candidates");
      }

      // Verify challenge belongs to organization
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.challengeId },
      });

      if (
        !challenge ||
        challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Challenge not found");
      }

      // Check if candidate already exists for this challenge
      const existingCandidate = await ctx.db.candidate.findUnique({
        where: {
          email_challengeId: {
            email: input.email,
            challengeId: input.challengeId,
          },
        },
      });

      if (existingCandidate) {
        throw new Error("Candidate already added to this challenge");
      }

      // Generate unique token for candidate
      const token = generateSecureToken();

      const candidate = await ctx.db.candidate.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          position: input.position,
          token,
          challengeId: input.challengeId,
        },
      });

      // Create initial submission
      await ctx.db.submission.create({
        data: {
          challengeId: input.challengeId,
          candidateId: candidate.id,
          content: "",
          status: "NOT_STARTED",
        },
      });

      // TODO: Send challenge invitation email using Resend

      return { ...candidate, challengeUrl: `/challenge/${token}` };
    }),

  // Get challenge by candidate token (public)
  getByCandidateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findUnique({
        where: { token: input.token },
        include: {
          challenge: {
            include: {
              organization: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
          submissions: {
            include: {
              events: {
                orderBy: { timestamp: "asc" },
              },
            },
          },
        },
      });

      if (!candidate) {
        throw new Error("Invalid challenge token");
      }

      return candidate;
    }),

  // Get challenge submissions
  getSubmissions: protectedProcedure
    .input(
      z.object({
        challengeId: z.string(),
        status: z
          .enum([
            "NOT_STARTED",
            "IN_PROGRESS",
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
          ])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Verify challenge belongs to organization
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.challengeId },
      });

      if (
        !challenge ||
        challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Challenge not found");
      }

      const submissions = await ctx.db.submission.findMany({
        where: {
          challengeId: input.challengeId,
          ...(input.status && { status: input.status }),
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              position: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              events: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });

      let nextCursor: typeof input.cursor | undefined;
      if (submissions.length > input.limit) {
        const nextItem = submissions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        submissions,
        nextCursor,
      };
    }),

  // Duplicate challenge
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user can create challenges
      if (!["ADMIN", "HIRING_MANAGER"].includes(ctx.session.user.role)) {
        throw new Error(
          "Only admins and hiring managers can duplicate challenges",
        );
      }

      // Get original challenge
      const originalChallenge = await ctx.db.challenge.findUnique({
        where: { id: input.id },
      });

      if (
        !originalChallenge ||
        originalChallenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Challenge not found");
      }

      // Create duplicate
      return ctx.db.challenge.create({
        data: {
          title: `${originalChallenge.title} (Copy)`,
          description: originalChallenge.description,
          instructions: originalChallenge.instructions,
          timeLimit: originalChallenge.timeLimit,
          status: "DRAFT",
          organizationId: ctx.session.user.organizationId,
          creatorId: ctx.session.user.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }),
});
