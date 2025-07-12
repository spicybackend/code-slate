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
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconClipboardList,
  IconClock,
  IconDots,
  IconDownload,
  IconEye,
  IconFilter,
  IconMail,
  IconPlayerPlay,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const challengeIdParam = searchParams.get("challengeId");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(
    searchParams.get("status") || null,
  );
  const [challengeFilter, setChallengeFilter] = useState<string | null>(
    challengeIdParam || null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);

  const pageSize = 10;

  // Fetch submissions
  const {
    data: submissionsData,
    isLoading,
    refetch,
  } = api.submission.getAll.useQuery({
    status: statusFilter as any,
    challengeId: challengeFilter || undefined,
    limit: pageSize,
  });

  // Fetch challenges for filter dropdown
  const { data: challengesData } = api.challenge.getAll.useQuery({
    limit: 100,
  });

  const updateStatusMutation = api.submission.updateStatus.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Submission status updated",
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

  const _assignReviewerMutation = api.submission.assignReviewer.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Reviewer assigned successfully",
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

  const submissions = submissionsData?.submissions || [];
  const challenges = challengesData?.challenges || [];

  // Filter submissions based on search
  const filteredSubmissions = submissions.filter(
    (submission) =>
      submission.candidate.name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      submission.candidate.email
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      submission.challenge.title
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()),
  );

  const handleStatusUpdate = (
    submissionId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    updateStatusMutation.mutate({ submissionId, status });
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return IconClock;
      case "ACCEPTED":
        return IconCheck;
      case "REJECTED":
        return IconX;
      case "IN_PROGRESS":
        return IconPlayerPlay;
      default:
        return IconClipboardList;
    }
  };

  const formatTimeSpent = (seconds: number | null) => {
    if (!seconds) return "—";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "NOT_STARTED", label: "Not Started" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "SUBMITTED", label: "Submitted" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const challengeOptions = [
    { value: "", label: "All Challenges" },
    ...challenges.map((challenge) => ({
      value: challenge.id,
      label: challenge.title,
    })),
  ];

  return (
    <AppShellLayout>
      <Container size="xl">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={1}>Submissions</Title>
              <Text c="dimmed">Review and manage candidate submissions</Text>
            </div>
            <Group>
              <Button
                variant="outline"
                leftSection={<IconDownload size={16} />}
              >
                Export
              </Button>
            </Group>
          </Group>

          {/* Filters */}
          <Card withBorder p="md">
            <Group>
              <TextInput
                placeholder="Search candidates or challenges..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Filter by status"
                data={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
                w={200}
                leftSection={<IconFilter size={16} />}
              />
              <Select
                placeholder="Filter by challenge"
                data={challengeOptions}
                value={challengeFilter}
                onChange={setChallengeFilter}
                clearable
                w={250}
              />
            </Group>
          </Card>

          {/* Quick Stats */}
          <Group grow>
            <Card withBorder p="md" ta="center">
              <Text size="lg" fw={700}>
                {submissions.filter((s) => s.status === "SUBMITTED").length}
              </Text>
              <Text size="sm" c="dimmed">
                Awaiting Review
              </Text>
            </Card>
            <Card withBorder p="md" ta="center">
              <Text size="lg" fw={700}>
                {submissions.filter((s) => s.status === "UNDER_REVIEW").length}
              </Text>
              <Text size="sm" c="dimmed">
                Under Review
              </Text>
            </Card>
            <Card withBorder p="md" ta="center">
              <Text size="lg" fw={700}>
                {submissions.filter((s) => s.status === "ACCEPTED").length}
              </Text>
              <Text size="sm" c="dimmed">
                Accepted
              </Text>
            </Card>
            <Card withBorder p="md" ta="center">
              <Text size="lg" fw={700}>
                {submissions.filter((s) => s.status === "REJECTED").length}
              </Text>
              <Text size="sm" c="dimmed">
                Rejected
              </Text>
            </Card>
          </Group>

          {/* Submissions Table */}
          <Card withBorder p={0}>
            {isLoading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Text>Loading submissions...</Text>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                {submissions.length === 0 ? (
                  <Alert
                    icon={<IconAlertCircle size="1rem" />}
                    title="No Submissions Yet"
                    color="blue"
                    variant="light"
                  >
                    <Text size="sm" mb="md">
                      Submissions will appear here once candidates start
                      completing challenges.
                    </Text>
                    <Button
                      component={Link}
                      href="/challenges"
                      leftSection={<IconClipboardList size={16} />}
                    >
                      View Challenges
                    </Button>
                  </Alert>
                ) : (
                  <Text c="dimmed">
                    No submissions match your search criteria.
                  </Text>
                )}
              </div>
            ) : (
              <Table verticalSpacing="md" horizontalSpacing="lg">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Candidate</Table.Th>
                    <Table.Th>Challenge</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Time Spent</Table.Th>
                    <Table.Th>Submitted</Table.Th>
                    <Table.Th>Reviewer</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSubmissions.map((submission) => {
                    const StatusIcon = getStatusIcon(submission.status);
                    return (
                      <Table.Tr key={submission.id}>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar size="sm" radius="xl">
                              {submission.candidate.name
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>
                            <div>
                              <Text size="sm" fw={500}>
                                {submission.candidate.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {submission.candidate.email}
                              </Text>
                              {submission.candidate.position && (
                                <Text size="xs" c="dimmed">
                                  {submission.candidate.position}
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>
                              {submission.challenge.title}
                            </Text>
                            <Badge
                              size="xs"
                              variant="light"
                              color={
                                submission.challenge.status === "ACTIVE"
                                  ? "green"
                                  : "gray"
                              }
                            >
                              {submission.challenge.status}
                            </Badge>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={getStatusColor(submission.status)}
                            variant="light"
                            leftSection={<StatusIcon size={12} />}
                          >
                            {submission.status.replace("_", " ").toLowerCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {formatTimeSpent(submission.totalTimeSpent)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {submission.submittedAt
                              ? new Date(
                                  submission.submittedAt,
                                ).toLocaleDateString()
                              : "—"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {submission.reviewer ? (
                            <Group gap="xs">
                              <Avatar size="xs" radius="xl">
                                {submission.reviewer.name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </Avatar>
                              <Text size="xs">{submission.reviewer.name}</Text>
                            </Group>
                          ) : (
                            <Text size="xs" c="dimmed">
                              Unassigned
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <Tooltip label="Review Submission">
                              <ActionIcon
                                component={Link}
                                href={`/submissions/${submission.id}`}
                                variant="subtle"
                                size="sm"
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Menu shadow="md" width={200}>
                              <Menu.Target>
                                <ActionIcon variant="subtle" size="sm">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconEye size={14} />}
                                  component={Link}
                                  href={`/submissions/${submission.id}`}
                                >
                                  Review Submission
                                </Menu.Item>
                                {submission.status === "SUBMITTED" && (
                                  <>
                                    <Menu.Divider />
                                    <Menu.Item
                                      leftSection={<IconCheck size={14} />}
                                      color="green"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          submission.id,
                                          "ACCEPTED",
                                        )
                                      }
                                    >
                                      Accept
                                    </Menu.Item>
                                    <Menu.Item
                                      leftSection={<IconX size={14} />}
                                      color="red"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          submission.id,
                                          "REJECTED",
                                        )
                                      }
                                    >
                                      Reject
                                    </Menu.Item>
                                  </>
                                )}
                                <Menu.Divider />
                                <Menu.Item leftSection={<IconMail size={14} />}>
                                  Contact Candidate
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconDownload size={14} />}
                                >
                                  Export Data
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

          {/* Pagination */}
          {filteredSubmissions.length > 0 && (
            <Group justify="center">
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={Math.ceil(filteredSubmissions.length / pageSize)}
              />
            </Group>
          )}
        </Stack>
      </Container>
    </AppShellLayout>
  );
}
