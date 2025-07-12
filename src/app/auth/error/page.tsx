"use client";

import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const errorMessages = {
  Signin: "Try signing in with a different account.",
  OAuthSignin: "Try signing in with a different account.",
  OAuthCallback: "Try signing in with a different account.",
  OAuthCreateAccount: "Try signing in with a different account.",
  EmailCreateAccount: "Try signing in with a different account.",
  Callback: "Try signing in with a different account.",
  OAuthAccountNotLinked:
    "To confirm your identity, sign in with the same account you used originally.",
  EmailSignin: "The e-mail could not be sent.",
  CredentialsSignin:
    "Sign in failed. Check the details you provided are correct.",
  SessionRequired: "Please sign in to access this page.",
  default: "Unable to sign in.",
};

function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessage = error
    ? errorMessages[error as keyof typeof errorMessages] ||
      errorMessages.default
    : errorMessages.default;

  return (
    <Container size={420} my={40}>
      <Title ta="center" c="red">
        Authentication Error
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        There was a problem signing you in
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Sign In Error"
            color="red"
            variant="light"
          >
            {errorMessage}
          </Alert>

          {error === "OAuthAccountNotLinked" && (
            <Alert color="blue" variant="light">
              <Text size="sm">
                It looks like you've previously signed in with a different
                method. Please use the same sign-in method you used before, or
                contact your administrator to link your accounts.
              </Text>
            </Alert>
          )}

          <Button component={Link} href="/auth/signin" variant="filled">
            Try Again
          </Button>

          <Button component={Link} href="/" variant="subtle">
            Go Home
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

export default function AuthErrorPage() {
  <Suspense>
    <AuthError />
  </Suspense>;
}
