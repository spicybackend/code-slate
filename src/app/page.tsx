"use client";

import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.organizationId) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <Container size="sm" py={80}>
        <Text ta="center">Loading...</Text>
      </Container>
    );
  }

  if (status === "authenticated") {
    return (
      <Container size="sm" py={80}>
        <Text ta="center">Redirecting to dashboard...</Text>
      </Container>
    );
  }

  return (
    <Container size="sm" py={80}>
      <Stack align="center" gap="xl">
        <div style={{ textAlign: "center" }}>
          <Title order={1} size="h1" mb="md">
            Welcome to Code Slate
          </Title>
          <Text size="lg" c="dimmed" mb="xl">
            A comprehensive platform for technical interviews and code
            challenges
          </Text>
        </div>

        <Stack gap="md" align="center">
          <Text size="md" ta="center" maw={600}>
            Code Slate helps organizations create, distribute, and review code
            challenges for technical interviews. Track candidate progress in
            real-time and make informed hiring decisions.
          </Text>

          <Group mt="xl">
            <Button
              component={Link}
              href="/auth/signin"
              size="lg"
              leftSection={<IconLogin size={20} />}
            >
              Sign In to Your Organization
            </Button>
          </Group>

          <Text size="sm" c="dimmed" ta="center" mt="md">
            Need access to an organization?{" "}
            <Text component="a" href="mailto:admin@example.com" c="blue">
              Contact your administrator
            </Text>
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
