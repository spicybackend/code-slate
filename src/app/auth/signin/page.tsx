"use client";

import {
  Anchor,
  Button,
  Container,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Suspense, useState } from "react";

function SignIn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length < 6 ? "Password must be at least 6 characters" : null,
    },
  });

  const handleCredentialsSignIn = async (values: {
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        notifications.show({
          title: "Sign In Failed",
          message: "Invalid email or password",
          color: "red",
        });
      } else {
        // Get the session to check user role
        const session = await getSession();
        if (session?.user) {
          notifications.show({
            title: "Welcome!",
            message: "Successfully signed in",
            color: "green",
          });
          router.push(callbackUrl);
        } else {
          notifications.show({
            title: "Sign In Issue",
            message: "Authentication succeeded but session not found",
            color: "orange",
          });
        }
      }
    } catch (_error) {
      notifications.show({
        title: "Error",
        message: "An error occurred during sign in",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (_error) {
      notifications.show({
        title: "Error",
        message: "An error occurred during Google sign in",
        color: "red",
      });
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Welcome to Code Slate</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Sign in to your organization account
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleCredentialsSignIn)}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="your@email.com"
              required
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              {...form.getInputProps("password")}
            />

            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </Stack>
        </form>

        <Divider label="Or continue with" labelPosition="center" my="lg" />

        <Button
          variant="default"
          fullWidth
          onClick={handleGoogleSignIn}
          loading={loading}
        >
          Continue with Google
        </Button>

        <Text c="dimmed" size="sm" ta="center" mt="md">
          Need access?{" "}
          <Anchor size="sm" href="mailto:admin@example.com">
            Contact your administrator
          </Anchor>
        </Text>
      </Paper>
    </Container>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
