import { render } from "@react-email/components";
import { sendEmail } from "./client";
import { ChallengeInvitationEmail } from "./templates/challenge-invitation";
import { OrganizationInvitationEmail } from "./templates/organization-invitation";

export interface SendOrganizationInvitationParams {
  inviteeEmail: string;
  organizationName: string;
  inviterName: string;
  inviteToken: string;
  role: string;
  baseUrl: string;
}

export interface SendChallengeInvitationParams {
  candidateName: string;
  candidateEmail: string;
  challengeTitle: string;
  challengeDescription: string;
  organizationName: string;
  position?: string;
  timeLimit?: number;
  challengeToken: string;
  baseUrl: string;
  expiresAt?: Date;
}

export interface SendChallengeReminderParams {
  candidateName: string;
  candidateEmail: string;
  challengeTitle: string;
  organizationName: string;
  challengeToken: string;
  baseUrl: string;
  expiresAt?: Date;
}

/**
 * Send an organization invitation email
 */
export async function sendOrganizationInvitation(
  params: SendOrganizationInvitationParams,
) {
  const inviteUrl = `${params.baseUrl}/invitation/${params.inviteToken}`;

  const emailHtml = await render(
    OrganizationInvitationEmail({
      inviteeEmail: params.inviteeEmail,
      organizationName: params.organizationName,
      inviterName: params.inviterName,
      inviteUrl,
      role: params.role,
    }),
  );

  const emailText = `
You're invited to join ${params.organizationName} on Code Slate

${params.inviterName} has invited you to join ${params.organizationName} as a ${params.role.toLowerCase()}.

Accept your invitation: ${inviteUrl}

Code Slate - Technical Interview Platform
  `.trim();

  return sendEmail({
    to: params.inviteeEmail,
    subject: `You're invited to join ${params.organizationName} on Code Slate`,
    html: emailHtml,
    text: emailText,
  });
}

/**
 * Send a challenge invitation email
 */
export async function sendChallengeInvitation(
  params: SendChallengeInvitationParams,
) {
  const challengeUrl = `${params.baseUrl}/challenge/${params.challengeToken}`;

  const emailHtml = await render(
    ChallengeInvitationEmail({
      candidateName: params.candidateName,
      candidateEmail: params.candidateEmail,
      challengeTitle: params.challengeTitle,
      challengeDescription: params.challengeDescription,
      organizationName: params.organizationName,
      position: params.position,
      timeLimit: params.timeLimit,
      challengeUrl,
      expiresAt: params.expiresAt,
    }),
  );

  const timeText = params.timeLimit ? ` (${params.timeLimit} minutes)` : "";
  const positionText = params.position
    ? ` for the ${params.position} position`
    : "";

  const emailText = `
Code Challenge from ${params.organizationName}

Hi ${params.candidateName},

${params.organizationName} has invited you to complete a coding challenge${positionText}.

Challenge: ${params.challengeTitle}
${params.challengeDescription}

Time Limit${timeText}

Start your challenge: ${challengeUrl}

Good luck!
Code Slate - Technical Interview Platform
  `.trim();

  return sendEmail({
    to: params.candidateEmail,
    subject: `Code Challenge${positionText}: ${params.challengeTitle}`,
    html: emailHtml,
    text: emailText,
  });
}

/**
 * Send a challenge reminder email
 */
export async function sendChallengeReminder(
  params: SendChallengeReminderParams,
) {
  const challengeUrl = `${params.baseUrl}/challenge/${params.challengeToken}`;

  const expiryText = params.expiresAt
    ? ` Please complete it by ${params.expiresAt.toLocaleDateString()}.`
    : "";

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Reminder: Complete Your Code Challenge</h2>

      <p>Hi ${params.candidateName},</p>

      <p>This is a friendly reminder that you have a pending code challenge from <strong>${params.organizationName}</strong>.</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">${params.challengeTitle}</h3>
      </div>

      <p>${expiryText}</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${challengeUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Complete Challenge
        </a>
      </div>

      <p>If the button doesn't work, copy and paste this URL: <a href="${challengeUrl}">${challengeUrl}</a></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 14px;">
        Code Slate - Technical Interview Platform
      </p>
    </div>
  `;

  const emailText = `
Reminder: Complete Your Code Challenge

Hi ${params.candidateName},

This is a friendly reminder that you have a pending code challenge from ${params.organizationName}.

Challenge: ${params.challengeTitle}${expiryText}

Complete your challenge: ${challengeUrl}

Code Slate - Technical Interview Platform
  `.trim();

  return sendEmail({
    to: params.candidateEmail,
    subject: `Reminder: Complete your code challenge - ${params.challengeTitle}`,
    html: emailHtml,
    text: emailText,
  });
}

/**
 * Send a submission notification to reviewers
 */
export async function sendSubmissionNotification({
  reviewerEmail,
  reviewerName,
  candidateName,
  challengeTitle,
  organizationName,
  submissionId,
  baseUrl,
}: {
  reviewerEmail: string;
  reviewerName: string;
  candidateName: string;
  challengeTitle: string;
  organizationName: string;
  submissionId: string;
  baseUrl: string;
}) {
  const reviewUrl = `${baseUrl}/submissions/${submissionId}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">New Submission Ready for Review</h2>

      <p>Hi ${reviewerName},</p>

      <p><strong>${candidateName}</strong> has submitted their solution for the code challenge:</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0; color: #1f2937;">${challengeTitle}</h3>
      </div>

      <p>The submission is now ready for your review, including keystroke playback and analysis.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Review Submission
        </a>
      </div>

      <p>If the button doesn't work, copy and paste this URL: <a href="${reviewUrl}">${reviewUrl}</a></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 14px;">
        ${organizationName} - Code Slate Platform
      </p>
    </div>
  `;

  const emailText = `
New Submission Ready for Review

Hi ${reviewerName},

${candidateName} has submitted their solution for: ${challengeTitle}

Review the submission: ${reviewUrl}

${organizationName} - Code Slate Platform
  `.trim();

  return sendEmail({
    to: reviewerEmail,
    subject: `New submission from ${candidateName}: ${challengeTitle}`,
    html: emailHtml,
    text: emailText,
  });
}
