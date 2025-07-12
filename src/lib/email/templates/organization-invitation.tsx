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

interface OrganizationInvitationEmailProps {
  inviteeEmail: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}

export const OrganizationInvitationEmail = ({
  inviteeEmail,
  organizationName,
  inviterName,
  inviteUrl,
  role,
}: OrganizationInvitationEmailProps) => {
  const previewText = `Join ${organizationName} on Code Slate`;

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
            You're invited to join {organizationName}
          </Heading>

          <Text style={text}>Hi there,</Text>

          <Text style={text}>
            <strong>{inviterName}</strong> has invited you to join{" "}
            <strong>{organizationName}</strong> on Code Slate as a{" "}
            <strong>{role.toLowerCase()}</strong>.
          </Text>

          <Text style={text}>
            Code Slate is a platform for conducting technical interviews through
            code challenges. You'll be able to create challenges, invite
            candidates, and review their submissions with detailed analytics.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:{" "}
            <Link href={inviteUrl} style={link}>
              {inviteUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This invitation was sent to{" "}
            <Link href={`mailto:${inviteeEmail}`} style={link}>
              {inviteeEmail}
            </Link>
            . If you were not expecting this invitation, you can ignore this
            email.
          </Text>

          <Text style={footer}>Code Slate - Technical Interview Platform</Text>
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

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

export default OrganizationInvitationEmail;
