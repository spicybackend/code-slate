import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ChallengeInvitationEmailProps {
  candidateName: string;
  candidateEmail: string;
  challengeTitle: string;
  challengeDescription: string;
  organizationName: string;
  position?: string;
  timeLimit?: number;
  challengeUrl: string;
  expiresAt?: Date;
}

export const ChallengeInvitationEmail = ({
  candidateName,
  candidateEmail,
  challengeTitle,
  challengeDescription,
  organizationName,
  position,
  timeLimit,
  challengeUrl,
  expiresAt,
}: ChallengeInvitationEmailProps) => {
  const previewText = `Code challenge from ${organizationName}: ${challengeTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>Code Slate</Text>
          </Section>

          <Heading style={h1}>
            You've been invited to complete a code challenge
          </Heading>

          <Text style={text}>Hi {candidateName},</Text>

          <Text style={text}>
            {organizationName} has invited you to complete a coding challenge
            {position && ` for the ${position} position`}. This is an
            opportunity to showcase your technical skills.
          </Text>

          <Section style={challengeSection}>
            <Text>{challengeTitle}</Text>
            <Text>{challengeDescription}</Text>
          </Section>

          {timeLimit && (
            <Text style={infoText}>
              <strong>Time Limit:</strong> {timeLimit} minutes
            </Text>
          )}

          {expiresAt && (
            <Text style={infoText}>
              <strong>Complete by:</strong>{" "}
              {expiresAt.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={challengeUrl}>
              Start Challenge
            </Button>
          </Section>

          <Section style={instructionsSection}>
            <Heading style={h2}>Instructions</Heading>
            <Text style={text}>
              • Click the button above to access your personalized challenge
            </Text>
            <Text style={text}>
              • You can save your progress and return to complete it later
            </Text>
            <Text style={text}>
              • Your session will be tracked for review purposes
            </Text>
            <Text style={text}>
              • Make sure you have a stable internet connection
            </Text>
          </Section>

          <Text style={text}>
            If the button doesn't work, copy and paste this URL into your
            browser:
          </Text>
          <Text style={urlText}>
            <Link href={challengeUrl} style={link}>
              {challengeUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This challenge was sent to{" "}
            <Link href={`mailto:${candidateEmail}`} style={link}>
              {candidateEmail}
            </Link>{" "}
            by {organizationName}. If you were not expecting this, please
            contact the organization directly.
          </Text>

          <Text style={footer}>
            Good luck with your challenge!
            <br />
            Code Slate - Technical Interview Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const logoSection = {
  padding: "0 0 40px",
  textAlign: "center" as const,
};

const logo = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const h2 = {
  color: "#1f2937",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "24px 0 16px 0",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const infoText = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "8px 0",
  padding: "8px 16px",
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
};

const challengeSection = {
  margin: "24px 0",
  padding: "20px",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const _challengeTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 8px 0",
} as const;

const _challengeDescription = {
  fontSize: "16px",
  color: "#4b5563",
  lineHeight: "24px",
  margin: "0",
} as const;

const instructionsSection = {
  margin: "32px 0",
  padding: "20px",
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  border: "1px solid #fbbf24",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#059669",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
};

const urlText = {
  wordBreak: "break-all" as const,
  margin: "16px 0",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

export default ChallengeInvitationEmail;
