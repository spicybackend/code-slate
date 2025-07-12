import { z } from "zod";
import { generateSecureToken, hashPassword } from "~/lib/crypto";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
  // Get current user's organization
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.organizationId) {
      throw new Error("User not associated with an organization");
    }

    return ctx.db.organization.findUnique({
      where: { id: ctx.session.user.organizationId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            challenges: true,
            users: true,
          },
        },
      },
    });
  }),

  // Get organization stats for dashboard
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.organizationId) {
      throw new Error("User not associated with an organization");
    }

    const organizationId = ctx.session.user.organizationId;

    const [
      totalChallenges,
      activeChallenges,
      totalCandidates,
      pendingSubmissions,
      submittedSubmissions,
      reviewedSubmissions,
    ] = await Promise.all([
      ctx.db.challenge.count({
        where: { organizationId },
      }),
      ctx.db.challenge.count({
        where: { organizationId, status: "ACTIVE" },
      }),
      ctx.db.candidate.count({
        where: { challenge: { organizationId } },
      }),
      ctx.db.submission.count({
        where: {
          challenge: { organizationId },
          status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        },
      }),
      ctx.db.submission.count({
        where: {
          challenge: { organizationId },
          status: "SUBMITTED",
        },
      }),
      ctx.db.submission.count({
        where: {
          challenge: { organizationId },
          status: { in: ["ACCEPTED", "REJECTED"] },
        },
      }),
    ]);

    return {
      totalChallenges,
      activeChallenges,
      totalCandidates,
      pendingSubmissions,
      submittedSubmissions,
      reviewedSubmissions,
    };
  }),

  // Create organization invitation
  createInvitation: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["ADMIN", "REVIEWER", "HIRING_MANAGER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Only admins can invite users");
      }

      const organizationId = ctx.session.user.organizationId;

      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Check if invitation already exists
      const existingInvitation = await ctx.db.organizationInvitation.findUnique(
        {
          where: {
            email_organizationId: {
              email: input.email,
              organizationId,
            },
          },
        },
      );

      if (existingInvitation && !existingInvitation.accepted) {
        throw new Error("Invitation already sent to this email");
      }

      // Create invitation
      const token = generateSecureToken();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await ctx.db.organizationInvitation.create({
        data: {
          email: input.email,
          token,
          role: input.role,
          expires,
          organizationId,
        },
        include: {
          organization: true,
        },
      });

      // TODO: Send invitation email using Resend

      return invitation;
    }),

  // Accept organization invitation
  acceptInvitation: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find invitation
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { token: input.token },
        include: { organization: true },
      });

      if (!invitation) {
        throw new Error("Invalid invitation token");
      }

      if (invitation.accepted) {
        throw new Error("Invitation already accepted");
      }

      if (invitation.expires < new Date()) {
        throw new Error("Invitation has expired");
      }

      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await hashPassword(input.password);

      // Create user and mark invitation as accepted
      const [user] = await Promise.all([
        ctx.db.user.create({
          data: {
            name: input.name,
            email: invitation.email,
            password: hashedPassword,
            role: invitation.role,
            organizationId: invitation.organizationId,
            emailVerified: new Date(),
          },
        }),
        ctx.db.organizationInvitation.update({
          where: { id: invitation.id },
          data: { accepted: true },
        }),
      ]);

      return user;
    }),

  // Get invitation by token
  getInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { token: input.token },
        include: { organization: true },
      });

      if (!invitation) {
        throw new Error("Invalid invitation token");
      }

      if (invitation.accepted) {
        throw new Error("Invitation already accepted");
      }

      if (invitation.expires < new Date()) {
        throw new Error("Invitation has expired");
      }

      return {
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        expires: invitation.expires,
      };
    }),

  // Update organization settings
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Only admins can update organization settings");
      }

      const organizationId = ctx.session.user.organizationId;

      // If slug is being updated, check if it's already taken
      if (input.slug) {
        const existingOrg = await ctx.db.organization.findUnique({
          where: { slug: input.slug },
        });

        if (existingOrg && existingOrg.id !== organizationId) {
          throw new Error("Organization slug already taken");
        }
      }

      return ctx.db.organization.update({
        where: { id: organizationId },
        data: input,
      });
    }),

  // Get organization users
  getUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.organizationId) {
      throw new Error("User not associated with an organization");
    }

    return ctx.db.user.findMany({
      where: { organizationId: ctx.session.user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Update user role
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["ADMIN", "REVIEWER", "HIRING_MANAGER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Only admins can update user roles");
      }

      // Check if target user is in the same organization
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (
        !targetUser ||
        targetUser.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("User not found in your organization");
      }

      // Don't allow changing own role
      if (input.userId === ctx.session.user.id) {
        throw new Error("Cannot change your own role");
      }

      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),

  // Remove user from organization
  removeUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.organizationId) {
        throw new Error("User not associated with an organization");
      }

      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Only admins can remove users");
      }

      // Check if target user is in the same organization
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (
        !targetUser ||
        targetUser.organizationId !== ctx.session.user.organizationId
      ) {
        throw new Error("User not found in your organization");
      }

      // Don't allow removing self
      if (input.userId === ctx.session.user.id) {
        throw new Error("Cannot remove yourself");
      }

      return ctx.db.user.delete({
        where: { id: input.userId },
      });
    }),
});
