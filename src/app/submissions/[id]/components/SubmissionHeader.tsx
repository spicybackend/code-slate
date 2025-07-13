"use client";

import { Avatar, Badge, Button, Card, Group, Text, Title } from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";

interface Candidate {
  name: string;
  email: string;
  position?: string;
}

interface Challenge {
  title: string;
}

interface Submission {
  id: string;
  status: "SUBMITTED" | "ACCEPTED" | "REJECTED";
  candidate: Candidate;
  challenge: Challenge;
  totalTimeSpent?: number;
  submittedAt?: Date;
}

interface SubmissionHeaderProps {
  submission: Submission;
  onStatusUpdate: (status: "ACCEPTED" | "REJECTED") => void;
  isUpdatingStatus: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "blue";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    default:
      return "gray";
  }
}

export function SubmissionHeader({
  submission,
  onStatusUpdate,
  isUpdatingStatus,
}: SubmissionHeaderProps) {
  return (
    <>
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Group mb="sm">
            <Button
              component={Link}
              href="/submissions"
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Submissions
            </Button>
            <Badge color={getStatusColor(submission.status)} variant="light">
              {submission.status.replace("_", " ").toLowerCase()}
            </Badge>
          </Group>
          <Title order={1}>Submission Review</Title>
          <Text c="dimmed">
            {submission.candidate.name} • {submission.challenge.title}
          </Text>
        </div>

        <Group>
          {submission.status === "SUBMITTED" && (
            <>
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={() => onStatusUpdate("ACCEPTED")}
                loading={isUpdatingStatus}
              >
                Accept
              </Button>
              <Button
                color="red"
                variant="outline"
                leftSection={<IconX size={16} />}
                onClick={() => onStatusUpdate("REJECTED")}
                loading={isUpdatingStatus}
              >
                Reject
              </Button>
            </>
          )}
          <Button variant="outline" leftSection={<IconDownload size={16} />}>
            Export
          </Button>
        </Group>
      </Group>

      {/* Candidate Info */}
      <Card withBorder p="md">
        <Group>
          <Avatar size="lg" radius="xl">
            {submission.candidate.name.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Group gap="lg">
              <div>
                <Text fw={500}>{submission.candidate.name}</Text>
                <Text size="sm" c="dimmed">
                  {submission.candidate.email}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Position
                </Text>
                <Text size="sm">
                  {submission.candidate.position || "Not specified"}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Time Spent
                </Text>
                <Text size="sm">
                  {submission.totalTimeSpent
                    ? `${Math.floor(submission.totalTimeSpent / 60)}:${(
                        submission.totalTimeSpent % 60
                      )
                        .toString()
                        .padStart(2, "0")}`
                    : "—"}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Submitted
                </Text>
                <Text size="sm">
                  {submission.submittedAt
                    ? new Date(submission.submittedAt).toLocaleDateString()
                    : "—"}
                </Text>
              </div>
            </Group>
          </div>
        </Group>
      </Card>
    </>
  );
}
