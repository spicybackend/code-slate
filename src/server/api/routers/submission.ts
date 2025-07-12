import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const submissionRouter = createTRPCRouter({
  // Get submission by ID (for reviewers)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      const submission = await ctx.db.submission.findUnique({
        where: { id: input.id },
        include: {
          challenge: {
            include: {
              organization: true,
            },
          },
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              position: true,
              token: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          events: {
            orderBy: { timestamp: "asc" },
          },
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (
        !submission ||
        submission.challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Submission not found");
      }

      return submission;
    }),

  // Get submission by candidate token (public)
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
        throw new Error("Invalid candidate token");
      }

      // Return the latest submission for this candidate
      const submission = candidate.submissions[0];
      if (!submission) {
        throw new Error("No submission found for candidate");
      }

      return {
        ...submission,
        candidate,
        challenge: candidate.challenge,
      };
    }),

  // Update submission content (for candidates)
  updateContent: publicProcedure
    .input(
      z.object({
        token: z.string(),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findUnique({
        where: { token: input.token },
        include: {
          submissions: true,
        },
      });

      if (!candidate) {
        throw new Error("Invalid candidate token");
      }

      const submission = candidate.submissions[0];
      if (!submission) {
        throw new Error("No submission found for candidate");
      }

      // Don't allow updates after submission
      if (
        submission.status === "SUBMITTED" ||
        submission.status === "UNDER_REVIEW" ||
        submission.status === "ACCEPTED" ||
        submission.status === "REJECTED"
      ) {
        throw new Error("Cannot update submitted submission");
      }

      // Update submission status if it's the first time
      const updateData: {
        content: string;
        updatedAt: Date;
        status?: "IN_PROGRESS";
        startedAt?: Date;
      } = {
        content: input.content,
        updatedAt: new Date(),
      };

      if (submission.status === "NOT_STARTED") {
        updateData.status = "IN_PROGRESS";
        updateData.startedAt = new Date();
      }

      return ctx.db.submission.update({
        where: { id: submission.id },
        data: updateData,
      });
    }),

  // Add keystroke event
  addKeystrokeEvent: publicProcedure
    .input(
      z.object({
        token: z.string(),
        events: z.array(
          z.object({
            type: z.enum([
              "FOCUS_IN",
              "FOCUS_OUT",
              "TYPING",
              "COPY",
              "PASTE",
              "DELETE",
              "SELECTION_CHANGE",
            ]),
            timestamp: z.date(),
            cursorStart: z.number().optional(),
            cursorEnd: z.number().optional(),
            content: z.string().optional(),
            windowFocus: z.boolean().default(true),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findUnique({
        where: { token: input.token },
        include: {
          submissions: true,
        },
      });

      if (!candidate) {
        throw new Error("Invalid candidate token");
      }

      const submission = candidate.submissions[0];
      if (!submission) {
        throw new Error("No submission found for candidate");
      }

      // Don't allow events after submission
      if (
        submission.status === "SUBMITTED" ||
        submission.status === "UNDER_REVIEW" ||
        submission.status === "ACCEPTED" ||
        submission.status === "REJECTED"
      ) {
        throw new Error("Cannot add events to submitted submission");
      }

      // Create keystroke events
      const events = input.events.map((event) => ({
        ...event,
        submissionId: submission.id,
      }));

      await ctx.db.keystrokeEvent.createMany({
        data: events,
      });

      return { success: true };
    }),

  // Submit submission (for candidates)
  submit: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findUnique({
        where: { token: input.token },
        include: {
          submissions: true,
          challenge: true,
        },
      });

      if (!candidate) {
        throw new Error("Invalid candidate token");
      }

      const submission = candidate.submissions[0];
      if (!submission) {
        throw new Error("No submission found for candidate");
      }

      if (
        submission.status === "SUBMITTED" ||
        submission.status === "UNDER_REVIEW" ||
        submission.status === "ACCEPTED" ||
        submission.status === "REJECTED"
      ) {
        throw new Error("Submission already submitted");
      }

      // Calculate total time spent
      const events = await ctx.db.keystrokeEvent.findMany({
        where: { submissionId: submission.id },
        orderBy: { timestamp: "asc" },
      });

      let totalTimeSpent = 0;
      let focusInTime: Date | null = null;

      for (const event of events) {
        if (event.type === "FOCUS_IN") {
          focusInTime = event.timestamp;
        } else if (event.type === "FOCUS_OUT" && focusInTime) {
          totalTimeSpent += Math.floor(
            (event.timestamp.getTime() - focusInTime.getTime()) / 1000,
          );
          focusInTime = null;
        }
      }

      // If still focused, add time until now
      if (focusInTime) {
        totalTimeSpent += Math.floor(
          (Date.now() - focusInTime.getTime()) / 1000,
        );
      }

      return ctx.db.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          totalTimeSpent,
        },
      });
    }),

  // Get all submissions for organization
  getAll: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "NOT_STARTED",
            "IN_PROGRESS",
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
          ])
          .nullish(),
        challengeId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      const submissions = await ctx.db.submission.findMany({
        where: {
          challenge: {
            organizationId: ctx.session.user.organizationId,
          },
          ...(input.status && { status: input.status }),
          ...(input.challengeId && { challengeId: input.challengeId }),
        },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
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

  // Assign reviewer to submission
  assignReviewer: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        reviewerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user can assign reviewers
      if (!["ADMIN", "HIRING_MANAGER"].includes(ctx.session.user.role)) {
        throw new Error("Only admins and hiring managers can assign reviewers");
      }

      // Verify submission belongs to organization
      const submission = await ctx.db.submission.findUnique({
        where: { id: input.submissionId },
        include: {
          challenge: true,
        },
      });

      if (
        !submission ||
        submission.challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Submission not found");
      }

      // Verify reviewer belongs to organization
      const reviewer = await ctx.db.user.findUnique({
        where: { id: input.reviewerId },
      });

      if (
        !reviewer ||
        reviewer.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Reviewer not found in your organization");
      }

      return ctx.db.submission.update({
        where: { id: input.submissionId },
        data: {
          reviewerId: input.reviewerId,
          status:
            submission.status === "SUBMITTED"
              ? "UNDER_REVIEW"
              : submission.status,
        },
      });
    }),

  // Update submission status
  updateStatus: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        status: z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Verify submission belongs to organization
      const submission = await ctx.db.submission.findUnique({
        where: { id: input.submissionId },
        include: {
          challenge: true,
        },
      });

      if (
        !submission ||
        submission.challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Submission not found");
      }

      // Check if user can review (assigned reviewer or admin)
      if (
        submission.reviewerId !== ctx.session.user.id &&
        ctx.session.user.role !== "ADMIN"
      ) {
        throw new Error(
          "Only assigned reviewers or admins can update submission status",
        );
      }

      const updateData: {
        status: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
        reviewedAt?: Date;
      } = {
        status: input.status,
      };

      if (input.status === "ACCEPTED" || input.status === "REJECTED") {
        updateData.reviewedAt = new Date();
      }

      return ctx.db.submission.update({
        where: { id: input.submissionId },
        data: updateData,
      });
    }),

  // Add comment to submission
  addComment: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Verify submission belongs to organization
      const submission = await ctx.db.submission.findUnique({
        where: { id: input.submissionId },
        include: {
          challenge: true,
        },
      });

      if (
        !submission ||
        submission.challenge.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("Submission not found");
      }

      return ctx.db.comment.create({
        data: {
          content: input.content,
          submissionId: input.submissionId,
          authorId: ctx.session.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }),

  // Update comment
  updateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Verify comment belongs to user
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        include: {
          submission: {
            include: {
              challenge: true,
            },
          },
        },
      });

      if (!comment || comment.authorId !== ctx.session.user.id) {
        throw new Error("Comment not found or not authorized");
      }

      if (
        comment.submission.challenge.organizationId !==
        ctx.session.user.organizationId
      ) {
        throw new Error("Not authorized");
      }

      return ctx.db.comment.update({
        where: { id: input.commentId },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
      });
    }),

  // Delete comment
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Verify comment belongs to user or user is admin
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        include: {
          submission: {
            include: {
              challenge: true,
            },
          },
        },
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (
        comment.submission.challenge.organizationId !==
        ctx.session.user.organizationId
      ) {
        throw new Error("Not authorized");
      }

      if (
        comment.authorId !== ctx.session.user.id &&
        ctx.session.user.role !== "ADMIN"
      ) {
        throw new Error("Only comment author or admin can delete comments");
      }

      return ctx.db.comment.delete({
        where: { id: input.commentId },
      });
    }),
});
