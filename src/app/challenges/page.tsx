"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Select,
  Pagination,
  Avatar,
  Tooltip,
  Alert,
} from "@mantine/core";
import {
  IconDots,
  IconEye,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconCopy,
  IconUsers,
  IconClipboardList,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import { useState } from "react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";

export default function ChallengesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);

  const pageSize = 10;

  // Fetch challenges
  const {
    data: challengesData,
    isLoading,
    refetch,
  } = api.challenge.getAll.useQuery({
    status: statusFilter as any,
    limit: pageSize,
  });

  const deleteMutation = api.challenge.delete.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Challenge deleted successfully",
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

  const duplicateMutation = api.challenge.duplicate.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Challenge duplicated successfully",
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

  const challenges = challengesData?.challenges || [];

  // Filter challenges based on search
  const filteredChallenges = challenges.filter(
    (challenge) =>
      challenge.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      challenge.description.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleDelete = async (challengeId: string) => {
    if (window.confirm("Are you sure you want to delete this challenge?")) {
      deleteMutation.mutate({ id: challengeId });
    }
  };

  const handleDuplicate = (challengeId: string) => {
    duplicateMutation.mutate({ id: challengeId });
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

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "DRAFT", label: "Draft" },
    { value: "PAUSED", label: "Paused" },
    { value: "ARCHIVED", label: "Archived" },
  ];

  return (
    <AppShellLayout>
      <Container size="xl">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={1}>Challenges</Title>
              <Text c="dimmed">Manage your code challenges and track submissions</Text>
            </div>
            <Button
              component={Link}
              href="/challenges/new"
              leftSection={<IconPlus size={16} />}
            >
              Create Challenge
            </Button>
          </Group>

          {/* Filters */}
          <Card withBorder p="md">
            <Group>
              <TextInput
                placeholder="Search challenges..."
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
              />
            </Group>
          </Card>

          {/* Challenges Table */}
          <Card withBorder p={0}>
            {isLoading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Text>Loading challenges...</Text>
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                {challenges.length === 0 ? (
                  <Alert
                    icon={<IconAlertCircle size="1rem" />}
                    title="No Challenges Yet"
                    color="blue"
                    variant="light"
                  >
                    <Text size="sm" mb="md">
                      Get started by creating your first code challenge.
                    </Text>
                    <Button
                      component={Link}
                      href="/challenges/new"
                      leftSection={<IconPlus size={16} />}
                    >
                      Create Your First Challenge
                    </Button>
                  </Alert>
                ) : (
                  <Text c="dimmed">No challenges match your search criteria.</Text>
                )}
              </div>
            ) : (
              <Table verticalSpacing="md" horizontalSpacing="lg">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Challenge</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Creator</Table.Th>
                    <Table.Th>Candidates</Table.Th>
                    <Table.Th>Submissions</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredChallenges.map((challenge) => (
                    <Table.Tr key={challenge.id}>
                      <Table.Td>
                        <div>
                          <Text fw={500} size="sm" lineClamp={1}>
                            {challenge.title}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {challenge.description}
                          </Text>
                          {challenge.timeLimit && (
                            <Text size="xs" c="dimmed" mt={2}>
                              Time limit: {challenge.timeLimit} minutes
                            </Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(challenge.status)} variant="light">
                          {challenge.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Avatar size="sm" radius="xl">
                            {challenge.creator.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text size="sm">{challenge.creator.name}</Text>
                            <Text size="xs" c="dimmed">
                              {challenge.creator.email}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconUsers size={16} color="var(--mantine-color-dimmed)" />
                          <Text size="sm">{challenge._count.candidates}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconClipboardList size={16} color="var(--mantine-color-dimmed)" />
                          <Text size="sm">{challenge._count.submissions}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {new Date(challenge.createdAt).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <Tooltip label="View Details">
                            <ActionIcon
                              component={Link}
                              href={`/challenges/${challenge.id}`}
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
                                href={`/challenges/${challenge.id}`}
                              >
                                View Details
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconPencil size={14} />}
                                component={Link}
                                href={`/challenges/${challenge.id}/edit`}
                              >
                                Edit
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconCopy size={14} />}
                                onClick={() => handleDuplicate(challenge.id)}
                                disabled={duplicateMutation.isPending}
                              >
                                Duplicate
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => handleDelete(challenge.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>

          {/* Pagination */}
          {filteredChallenges.length > 0 && (
            <Group justify="center">
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={Math.ceil(filteredChallenges.length / pageSize)}
              />
            </Group>
          )}
        </Stack>
      </Container>
    </AppShellLayout>
  );
}
