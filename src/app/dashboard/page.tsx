"use client";

import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconClipboardList,
  IconClockHour4,
  IconEye,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";

function StatsCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  color?: string;
  description?: string;
}) {
  return (
    <Card withBorder p="xl" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
          {description && (
            <Text c="dimmed" size="xs">
              {description}
            </Text>
          )}
        </div>
        <Icon
          size={50}
          stroke={1.5}
          color={`var(--mantine-color-${color}-6)`}
        />
      </Group>
    </Card>
  );
}

function RecentSubmissions() {
  const { data: submissionsData, isLoading } = api.submission.getAll.useQuery({
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card withBorder p="md">
        <Stack>
          <Text fw={500} size="lg">
            Recent Submissions
          </Text>
          {[...Array(3)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder
            <Skeleton key={`submission-skeleton-${i}`} height={60} />
          ))}
        </Stack>
      </Card>
    );
  }

  const submissions = submissionsData?.submissions || [];

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
        return IconClockHour4;
      case "ACCEPTED":
        return IconCircleCheck;
      case "REJECTED":
        return IconCircleX;
      default:
        return IconClipboardList;
    }
  };

  return (
    <Card withBorder p="md">
      <Group justify="space-between" mb="md">
        <Text fw={500} size="lg">
          Recent Submissions
        </Text>
        <Button
          component={Link}
          href="/submissions"
          variant="subtle"
          size="sm"
          rightSection={<IconEye size={16} />}
        >
          View All
        </Button>
      </Group>

      {submissions.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No submissions yet
        </Text>
      ) : (
        <Table>
          <Table.Tbody>
            {submissions.map((submission) => {
              const StatusIcon = getStatusIcon(submission.status);
              return (
                <Table.Tr key={submission.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar size="sm" radius="xl">
                        {submission.candidate.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>
                          {submission.candidate.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {submission.challenge.title}
                        </Text>
                      </div>
                    </Group>
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
                    <ActionIcon
                      component={Link}
                      href={`/submissions/${submission.id}`}
                      variant="subtle"
                      size="sm"
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}

function ActiveChallenges() {
  const { data: challengesData, isLoading } = api.challenge.getAll.useQuery({
    status: "ACTIVE",
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card withBorder p="md">
        <Stack>
          <Text fw={500} size="lg">
            Active Challenges
          </Text>
          {[...Array(3)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder
            <Skeleton key={`challenge-skeleton-${i}`} height={60} />
          ))}
        </Stack>
      </Card>
    );
  }

  const challenges = challengesData?.challenges || [];

  return (
    <Card withBorder p="md">
      <Group justify="space-between" mb="md">
        <Text fw={500} size="lg">
          Active Challenges
        </Text>
        <Button
          component={Link}
          href="/challenges"
          variant="subtle"
          size="sm"
          rightSection={<IconEye size={16} />}
        >
          View All
        </Button>
      </Group>

      {challenges.length === 0 ? (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="No Active Challenges"
          color="blue"
          variant="light"
        >
          <Text size="sm">
            You don't have any active challenges. Create your first challenge to
            start evaluating candidates.
          </Text>
          <Button
            component={Link}
            href="/challenges/new"
            mt="md"
            size="sm"
            leftSection={<IconPlus size={16} />}
          >
            Create Challenge
          </Button>
        </Alert>
      ) : (
        <Stack gap="md">
          {challenges.map((challenge) => (
            <Card key={challenge.id} withBorder p="sm" radius="sm">
              <Group justify="space-between">
                <div style={{ flex: 1 }}>
                  <Text fw={500} size="sm">
                    {challenge.title}
                  </Text>
                  <Group gap="xs" mt="xs">
                    <Text size="xs" c="dimmed">
                      {challenge._count.candidates} candidates
                    </Text>
                    <Text size="xs" c="dimmed">
                      •
                    </Text>
                    <Text size="xs" c="dimmed">
                      {challenge._count.submissions} submissions
                    </Text>
                  </Group>
                </div>
                <ActionIcon
                  component={Link}
                  href={`/challenges/${challenge.id}`}
                  variant="subtle"
                  size="sm"
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading: statsLoading } =
    api.organization.getStats.useQuery();

  return (
    <AppShellLayout>
      <Stack gap="xl">
        <div>
          <Title order={1}>Dashboard</Title>
          <Text c="dimmed" mt="xs">
            Welcome back, {session?.user?.name}
          </Text>
        </div>

        {/* Stats Overview */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {statsLoading ? (
            [...Array(4)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholder
              <Skeleton key={`stats-skeleton-${i}`} height={120} />
            ))
          ) : (
            <>
              <StatsCard
                title="Total Challenges"
                value={stats?.totalChallenges || 0}
                icon={IconClipboardList}
                color="blue"
              />
              <StatsCard
                title="Active Challenges"
                value={stats?.activeChallenges || 0}
                icon={IconClipboardList}
                color="green"
              />
              <StatsCard
                title="Total Candidates"
                value={stats?.totalCandidates || 0}
                icon={IconUsers}
                color="violet"
              />
              <StatsCard
                title="Pending Review"
                value={stats?.submittedSubmissions || 0}
                icon={IconClockHour4}
                color="orange"
                description="Submissions awaiting review"
              />
            </>
          )}
        </SimpleGrid>

        {/* Action Items */}
        {stats && stats.submittedSubmissions > 0 && (
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Action Required"
            color="orange"
            variant="light"
          >
            <Group justify="space-between">
              <Text size="sm">
                You have {stats.submittedSubmissions} submission
                {stats.submittedSubmissions === 1 ? "" : "s"} awaiting review.
              </Text>
              <Button
                component={Link}
                href="/submissions?status=SUBMITTED"
                size="sm"
                variant="filled"
              >
                Review Now
              </Button>
            </Group>
          </Alert>
        )}

        {/* Recent Activity */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <RecentSubmissions />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <ActiveChallenges />
          </Grid.Col>
        </Grid>

        {/* Quick Actions */}
        <Card withBorder p="md">
          <Text fw={500} size="lg" mb="md">
            Quick Actions
          </Text>
          <Group>
            <Button
              component={Link}
              href="/challenges/new"
              leftSection={<IconPlus size={16} />}
            >
              Create Challenge
            </Button>
            <Button
              component={Link}
              href="/submissions"
              variant="outline"
              leftSection={<IconClipboardList size={16} />}
            >
              View Submissions
            </Button>
            <Button
              component={Link}
              href="/organization"
              variant="outline"
              leftSection={<IconUsers size={16} />}
            >
              Manage Team
            </Button>
          </Group>
        </Card>
      </Stack>
    </AppShellLayout>
  );
}
