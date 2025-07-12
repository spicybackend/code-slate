"use client";

import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconDeviceFloppy,
  IconEye,
  IconSend,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";

interface ChallengeFormData {
  title: string;
  description: string;
  instructions: string;
  timeLimit: number | null;
  status: "DRAFT" | "ACTIVE";
}

export default function NewChallengePage() {
  const router = useRouter();
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const form = useForm<ChallengeFormData>({
    initialValues: {
      title: "",
      description: "",
      instructions: "",
      timeLimit: 60,
      status: "DRAFT",
    },
    validate: {
      title: (value) => (value.length < 1 ? "Title is required" : null),
      description: (value) =>
        value.length < 1 ? "Description is required" : null,
      instructions: (value) =>
        value.length < 1 ? "Instructions are required" : null,
      timeLimit: (value) =>
        value !== null && value < 1
          ? "Time limit must be at least 1 minute"
          : null,
    },
  });

  const createMutation = api.challenge.create.useMutation({
    onSuccess: (challenge) => {
      notifications.show({
        title: "Success",
        message: "Challenge created successfully",
        color: "green",
      });
      router.push(`/challenges/${challenge.id}`);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = (values: ChallengeFormData) => {
    createMutation.mutate({
      title: values.title,
      description: values.description,
      instructions: values.instructions,
      timeLimit: values.timeLimit || undefined,
    });
  };

  const handleSaveDraft = () => {
    const values = form.values;
    createMutation.mutate({
      title: values.title || "Untitled Challenge",
      description: values.description || "No description provided",
      instructions: values.instructions || "No instructions provided",
      timeLimit: values.timeLimit || undefined,
    });
  };

  if (isPreviewMode) {
    return (
      <AppShellLayout>
        <Container size="lg">
          <Stack gap="lg">
            {/* Preview Header */}
            <Group justify="space-between">
              <Group>
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => setIsPreviewMode(false)}
                >
                  Back to Editor
                </Button>
                <Title order={2}>Challenge Preview</Title>
              </Group>
            </Group>

            {/* Preview Content */}
            <Card withBorder p="lg">
              <Stack gap="md">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Challenge Title
                  </Text>
                  <Title order={1}>
                    {form.values.title || "Untitled Challenge"}
                  </Title>
                </div>

                <div>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Description
                  </Text>
                  <Text>
                    {form.values.description || "No description provided"}
                  </Text>
                </div>

                {form.values.timeLimit && (
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase">
                      Time Limit
                    </Text>
                    <Text>{form.values.timeLimit} minutes</Text>
                  </div>
                )}

                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" mb="md">
                    Instructions
                  </Text>
                  <Card
                    withBorder
                    p="md"
                    style={{ backgroundColor: "#f8f9fa" }}
                  >
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {form.values.instructions || "No instructions provided"}
                    </div>
                  </Card>
                </div>

                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" mb="md">
                    Code Editor (Preview)
                  </Text>
                  <Textarea
                    placeholder="// Candidates will write their code here..."
                    minRows={15}
                    disabled
                    styles={{
                      input: {
                        fontFamily: "Monaco, Menlo, monospace",
                        fontSize: "14px",
                        backgroundColor: "#ffffff",
                      },
                    }}
                  />
                </div>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </AppShellLayout>
    );
  }

  return (
    <AppShellLayout>
      <Container size="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between">
              <div>
                <Group>
                  <Button
                    component={Link}
                    href="/challenges"
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                  >
                    Back to Challenges
                  </Button>
                </Group>
                <Title order={1} mt="md">
                  Create New Challenge
                </Title>
                <Text c="dimmed">
                  Design a coding challenge for your candidates
                </Text>
              </div>

              <Group>
                <Button
                  variant="outline"
                  leftSection={<IconEye size={16} />}
                  onClick={() => setIsPreviewMode(true)}
                >
                  Preview
                </Button>
                <Button
                  variant="outline"
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={handleSaveDraft}
                  loading={createMutation.isPending}
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  leftSection={<IconSend size={16} />}
                  loading={createMutation.isPending}
                >
                  Create Challenge
                </Button>
              </Group>
            </Group>

            {/* Form */}
            <Card withBorder p="lg">
              <Stack gap="lg">
                {/* Basic Information */}
                <div>
                  <Title order={3} mb="md">
                    Basic Information
                  </Title>
                  <Stack gap="md">
                    <TextInput
                      label="Challenge Title"
                      placeholder="e.g., FizzBuzz Implementation"
                      required
                      {...form.getInputProps("title")}
                    />

                    <Textarea
                      label="Description"
                      placeholder="Brief description of what this challenge tests"
                      required
                      autosize
                      minRows={2}
                      {...form.getInputProps("description")}
                    />

                    <NumberInput
                      label="Time Limit (minutes)"
                      placeholder="60"
                      min={1}
                      max={480}
                      {...form.getInputProps("timeLimit")}
                      description="Maximum time candidates have to complete the challenge. Leave empty for no time limit."
                    />
                  </Stack>
                </div>

                {/* Instructions */}
                <div>
                  <Title order={3} mb="md">
                    Challenge Instructions
                  </Title>
                  <Textarea
                    label="Instructions"
                    placeholder={`# Challenge Instructions

Write your detailed instructions here. You can use:

## Formatting
- **Bold text**
- *Italic text*
- \`Code snippets\`

## Example
\`\`\`javascript
function example() {
  return "Hello World";
}
\`\`\`

## Requirements
1. Implement the solution
2. Handle edge cases
3. Include error handling
4. Add comments explaining your approach`}
                    required
                    autosize
                    minRows={15}
                    maxRows={25}
                    {...form.getInputProps("instructions")}
                    description="Provide clear instructions, examples, and requirements. Markdown formatting is supported."
                  />
                </div>

                {/* Guidelines */}
                <Alert
                  icon={<IconAlertCircle size="1rem" />}
                  title="Challenge Design Tips"
                  color="blue"
                  variant="light"
                >
                  <Text size="sm">
                    • Be specific about requirements and expected output
                    <br />• Include example inputs and outputs
                    <br />• Mention any constraints or edge cases to consider
                    <br />• Specify the programming language if required
                    <br />• Consider the difficulty level for your target
                    candidates
                  </Text>
                </Alert>
              </Stack>
            </Card>
          </Stack>
        </form>
      </Container>
    </AppShellLayout>
  );
}
