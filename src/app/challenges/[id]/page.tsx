"use client";

import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Modal,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconClipboardList,
  IconClock,
  IconCopy,
  IconDots,
  IconEdit,
  IconEye,
  IconMail,
  IconPlus,
  IconSend,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";

interface CandidateFormData {
  name: string;
  email: string;
  phone: string;
  position: string;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const challengeId = params.id as string;

  const [
    addCandidateOpened,
    { open: openAddCandidate, close: closeAddCandidate },
  ] = useDisclosure(false);
  const [activeTab, setActiveTab] = useState<string | null>("overview");

  // Fetch challenge data
  const {
    data: challenge,
    isLoading,
    refetch,
  } = api.challenge.getById.useQuery({ id: challengeId });

  // Mutations
  const addCandidateMutation = api.challenge.addCandidate.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Candidate invited successfully",
        color: "green",
      });
      closeAddCandidate();
      candidateForm.reset();
      refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const updateMutation = api.challenge.update.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Challenge updated successfully",
        color: "green",
      });
      refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const sendReminderMutation = api.challenge.sendReminder.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Reminder email sent successfully",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const removeCandidateMutation = api.challenge.removeCandidate.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Candidate removed successfully",
        color: "green",
      });
      refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Forms
  const candidateForm = useForm<CandidateFormData>({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      position: "",
    },
    validate: {
      name: (value) => (value.length < 1 ? "Name is required" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const handleAddCandidate = (values: CandidateFormData) => {
    addCandidateMutation.mutate({
      challengeId,
      ...values,
    });
  };

  const handleStatusChange = (status: "ACTIVE" | "PAUSED" | "ARCHIVED") => {
    updateMutation.mutate({
      id: challengeId,
      status,
    });
  };

  const copyLinkToClipboard = (token: string) => {
    const url = `${window.location.origin}/challenge/${token}`;
    navigator.clipboard.writeText(url);
    notifications.show({
      title: "Link Copied",
      message: "Challenge link copied to clipboard",
      color: "blue",
    });
  };

  const handleSendReminder = (candidateId: string) => {
    sendReminderMutation.mutate({ candidateId });
  };

  const handleRemoveCandidate = (
    candidateId: string,
    candidateName: string,
  ) => {
    modals.openConfirmModal({
      title: "Remove Candidate",
      children: (
        <Text size="sm">
          Are you sure you want to remove <strong>{candidateName}</strong> from
          this challenge? This action cannot be undone and will permanently
          delete their submission data.
        </Text>
      ),
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => removeCandidateMutation.mutate({ candidateId }),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "green";
      case "DRAFT":
        return "gray";
      case "PAUSED":
        return "yellow";
      case "ARCHIVED":
        return "red";
      default:
        return "blue";
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "yellow";
      case "UNDER_REVIEW":
        return "blue";
      case "ACCEPTED":
        return "green";
      case "REJECTED":
        return "red";
      case "IN_PROGRESS":
        return "orange";
      default:
        return "gray";
    }
  };

  if (isLoading) {
    return (
      <AppShellLayout>
        <Container size="xl">
          <Text>Loading challenge...</Text>
        </Container>
      </AppShellLayout>
    );
  }

  if (!challenge) {
    return (
      <AppShellLayout>
        <Container size="xl">
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Challenge Not Found"
            color="red"
          >
            The challenge you're looking for doesn't exist or you don't have
            permission to view it.
          </Alert>
        </Container>
      </AppShellLayout>
    );
  }

  return (
    <AppShellLayout>
      <Container size="xl">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Group mb="sm">
                <Button
                  component={Link}
                  href="/challenges"
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  Back to Challenges
                </Button>
                <Badge color={getStatusColor(challenge.status)} variant="light">
                  {challenge.status}
                </Badge>
              </Group>
              <Title order={1}>{challenge.title}</Title>
              <Text c="dimmed">{challenge.description}</Text>
            </div>

            <Group>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button
                    variant="outline"
                    leftSection={<IconDots size={16} />}
                  >
                    Actions
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    component={Link}
                    href={`/challenges/${challengeId}/edit`}
                  >
                    Edit Challenge
                  </Menu.Item>
                  {challenge.status === "DRAFT" && (
                    <Menu.Item
                      leftSection={<IconSend size={14} />}
                      onClick={() => handleStatusChange("ACTIVE")}
                    >
                      Activate Challenge
                    </Menu.Item>
                  )}
                  {challenge.status === "ACTIVE" && (
                    <Menu.Item
                      leftSection={<IconClock size={14} />}
                      onClick={() => handleStatusChange("PAUSED")}
                    >
                      Pause Challenge
                    </Menu.Item>
                  )}
                  {challenge.status === "PAUSED" && (
                    <Menu.Item
                      leftSection={<IconSend size={14} />}
                      onClick={() => handleStatusChange("ACTIVE")}
                    >
                      Resume Challenge
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => handleStatusChange("ARCHIVED")}
                  >
                    Archive Challenge
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>

          {/* Stats Cards */}
          <Group grow>
            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Total Candidates
                  </Text>
                  <Text fw={700} size="xl">
                    {challenge._count.candidates}
                  </Text>
                </div>
                <IconUsers size={24} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>

            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Submissions
                  </Text>
                  <Text fw={700} size="xl">
                    {challenge._count.submissions}
                  </Text>
                </div>
                <IconClipboardList
                  size={24}
                  color="var(--mantine-color-green-6)"
                />
              </Group>
            </Card>

            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Time Limit
                  </Text>
                  <Text fw={700} size="xl">
                    {challenge.timeLimit ? `${challenge.timeLimit}m` : "None"}
                  </Text>
                </div>
                <IconClock size={24} color="var(--mantine-color-orange-6)" />
              </Group>
            </Card>

            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Created
                  </Text>
                  <Text fw={700} size="xl">
                    {new Date(challenge.createdAt).toLocaleDateString()}
                  </Text>
                </div>
                <IconCalendar size={24} color="var(--mantine-color-violet-6)" />
              </Group>
            </Card>
          </Group>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="candidates">Candidates</Tabs.Tab>
              <Tabs.Tab value="submissions">Submissions</Tabs.Tab>
            </Tabs.List>

            {/* Overview Tab */}
            <Tabs.Panel value="overview" pt="lg">
              <Card withBorder p="lg">
                <Title order={3} mb="md">
                  Challenge Instructions
                </Title>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {challenge.instructions}
                </div>
              </Card>
            </Tabs.Panel>

            {/* Candidates Tab */}
            <Tabs.Panel value="candidates" pt="lg">
              <Card withBorder p={0}>
                <Group justify="space-between" p="lg" pb="md">
                  <Title order={3}>Candidates</Title>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={openAddCandidate}
                  >
                    Invite Candidate
                  </Button>
                </Group>

                {challenge.candidates.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center" }}>
                    <Text c="dimmed" mb="md">
                      No candidates invited yet.
                    </Text>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={openAddCandidate}
                    >
                      Invite Your First Candidate
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Candidate</Table.Th>
                        <Table.Th>Position</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Invited</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {challenge.candidates.map((candidate) => {
                        const submission = candidate.submissions[0];
                        return (
                          <Table.Tr key={candidate.id}>
                            <Table.Td>
                              <Group gap="sm">
                                <Avatar size="sm" radius="xl">
                                  {candidate.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <div>
                                  <Text size="sm" fw={500}>
                                    {candidate.name}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {candidate.email}
                                  </Text>
                                </div>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{candidate.position || "—"}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={getSubmissionStatusColor(
                                  submission?.status || "NOT_STARTED",
                                )}
                                variant="light"
                              >
                                {(submission?.status || "NOT_STARTED")
                                  .replace("_", " ")
                                  .toLowerCase()}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                {new Date(
                                  candidate.createdAt,
                                ).toLocaleDateString()}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" justify="flex-end">
                                <ActionIcon
                                  variant="subtle"
                                  size="sm"
                                  onClick={() =>
                                    copyLinkToClipboard(candidate.token)
                                  }
                                >
                                  <IconCopy size={16} />
                                </ActionIcon>
                                {submission && (
                                  <ActionIcon
                                    component={Link}
                                    href={`/submissions/${submission.id}`}
                                    variant="subtle"
                                    size="sm"
                                  >
                                    <IconEye size={16} />
                                  </ActionIcon>
                                )}
                                <Menu shadow="md" width={200}>
                                  <Menu.Target>
                                    <ActionIcon variant="subtle" size="sm">
                                      <IconDots size={16} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item
                                      leftSection={<IconMail size={14} />}
                                      onClick={() =>
                                        handleSendReminder(candidate.id)
                                      }
                                      disabled={sendReminderMutation.isPending}
                                    >
                                      Send Reminder
                                    </Menu.Item>
                                    <Menu.Item
                                      leftSection={<IconCopy size={14} />}
                                      onClick={() =>
                                        copyLinkToClipboard(candidate.token)
                                      }
                                    >
                                      Copy Link
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                      leftSection={<IconTrash size={14} />}
                                      color="red"
                                      onClick={() =>
                                        handleRemoveCandidate(
                                          candidate.id,
                                          candidate.name,
                                        )
                                      }
                                      disabled={
                                        removeCandidateMutation.isPending
                                      }
                                    >
                                      Remove Candidate
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Tabs.Panel>

            {/* Submissions Tab */}
            <Tabs.Panel value="submissions" pt="lg">
              <Card withBorder p="lg">
                <Group justify="space-between" mb="md">
                  <Title order={3}>Submissions</Title>
                  <Button
                    component={Link}
                    href={`/submissions?challengeId=${challengeId}`}
                    variant="outline"
                    leftSection={<IconEye size={16} />}
                  >
                    View All Submissions
                  </Button>
                </Group>

                {challenge.candidates.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No candidates invited yet. Invite candidates to see their
                    submissions here.
                  </Text>
                ) : (
                  <Text c="dimmed">
                    Detailed submission reviews are available in the submissions
                    section.
                  </Text>
                )}
              </Card>
            </Tabs.Panel>
          </Tabs>

          {/* Add Candidate Modal */}
          <Modal
            opened={addCandidateOpened}
            onClose={closeAddCandidate}
            title="Invite Candidate"
            size="md"
          >
            <form onSubmit={candidateForm.onSubmit(handleAddCandidate)}>
              <Stack gap="md">
                <TextInput
                  label="Full Name"
                  placeholder="John Doe"
                  required
                  {...candidateForm.getInputProps("name")}
                />

                <TextInput
                  label="Email Address"
                  placeholder="john.doe@example.com"
                  required
                  {...candidateForm.getInputProps("email")}
                />

                <TextInput
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  {...candidateForm.getInputProps("phone")}
                />

                <TextInput
                  label="Position"
                  placeholder="Frontend Developer"
                  {...candidateForm.getInputProps("position")}
                />

                <Group justify="flex-end" mt="md">
                  <Button variant="outline" onClick={closeAddCandidate}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={addCandidateMutation.isPending}
                    leftSection={<IconSend size={16} />}
                  >
                    Send Invitation
                  </Button>
                </Group>
              </Stack>
            </form>
          </Modal>
        </Stack>
      </Container>
    </AppShellLayout>
  );
}
