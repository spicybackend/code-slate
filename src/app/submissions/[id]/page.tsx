"use client";

import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  Modal,
  Select,
  Slider,
  Stack,
  Tabs,
  Text,
  Textarea,
  Timeline,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconSend,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";

interface PlaybackSettings {
  speed: number;
  showCursor: boolean;
  showFocusChanges: boolean;
}

interface CommentFormData {
  content: string;
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const submissionId = params.id as string;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackContent, setPlaybackContent] = useState("");
  const [_cursorPosition, setCursorPosition] = useState(0);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>({
    speed: 1,
    showCursor: true,
    showFocusChanges: true,
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [playbackStartTime, setPlaybackStartTime] = useState<Date | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<string | null>("review");
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);

  // Refs
  const playbackTextareaRef = useRef<HTMLTextAreaElement>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch submission data
  const {
    data: submission,
    isLoading,
    refetch,
  } = api.submission.getById.useQuery({ id: submissionId });

  // Mutations
  const addCommentMutation = api.submission.addComment.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Comment added successfully",
        color: "green",
      });
      commentForm.reset();
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

  // Forms
  const commentForm = useForm<CommentFormData>({
    initialValues: {
      content: "",
    },
    validate: {
      content: (value) => (value.length < 1 ? "Comment is required" : null),
    },
  });

  const events = submission?.events || [];
  const contentSnapshots = events.filter((e) => e.type === "CONTENT_SNAPSHOT");
  const focusEvents = events.filter(
    (e) => e.type === "FOCUS_IN" || e.type === "FOCUS_OUT",
  );

  // Calculate total duration based on first and last events
  const totalDuration =
    events.length > 0
      ? new Date(events[events.length - 1]?.timestamp || 0).getTime() -
        new Date(events[0]?.timestamp || 0).getTime()
      : 0;

  // Playback functions
  const resetPlayback = useCallback(() => {
    setPlaybackTime(0);
    setPlaybackContent("");
    setCursorPosition(0);
    setIsWindowFocused(true);
    setPlaybackStartTime(
      events.length > 0 ? new Date(events[0]?.timestamp || 0) : null,
    );
    if (playbackTextareaRef.current) {
      playbackTextareaRef.current.value = "";
    }
  }, [events]);

  const updatePlaybackAtTime = useCallback(
    (targetTime: number) => {
      if (!playbackStartTime) return;

      const targetTimestamp = new Date(
        playbackStartTime.getTime() + targetTime,
      );

      // Find the most recent content snapshot before or at target time
      const relevantSnapshot = [...contentSnapshots]
        .reverse()
        .find((event) => new Date(event.timestamp) <= targetTimestamp);

      // Update content and cursor
      if (relevantSnapshot) {
        const newContent = relevantSnapshot.content || "";
        const newCursorPos = relevantSnapshot.cursorStart || 0;

        setPlaybackContent(newContent);
        setCursorPosition(newCursorPos);

        if (playbackTextareaRef.current) {
          playbackTextareaRef.current.value = newContent;
          if (playbackSettings.showCursor) {
            playbackTextareaRef.current.setSelectionRange(
              newCursorPos,
              newCursorPos,
            );
          }
        }
      }

      // Update focus state based on most recent focus event
      if (playbackSettings.showFocusChanges) {
        const relevantFocusEvent = [...focusEvents]
          .reverse()
          .find((event) => new Date(event.timestamp) <= targetTimestamp);

        if (relevantFocusEvent) {
          setIsWindowFocused(relevantFocusEvent.type === "FOCUS_IN");
        }
      }
    },
    [playbackStartTime, contentSnapshots, focusEvents, playbackSettings],
  );

  const startPlayback = () => {
    if (!playbackStartTime && events.length > 0) {
      setPlaybackStartTime(events[0]?.timestamp ?? null);
    }
    setIsPlaying(true);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
  };

  const skipToTime = (timeMs: number) => {
    setPlaybackTime(timeMs);
    updatePlaybackAtTime(timeMs);
  };

  const handleAddComment = (values: CommentFormData) => {
    addCommentMutation.mutate({
      submissionId,
      content: values.content,
    });
  };

  const handleStatusUpdate = (status: "ACCEPTED" | "REJECTED") => {
    updateStatusMutation.mutate({ submissionId, status });
  };

  // Real-time playback interval
  useEffect(() => {
    if (isPlaying && totalDuration > 0) {
      const interval = 50; // Update every 50ms for smooth playback
      const step = interval * playbackSettings.speed;

      playbackIntervalRef.current = setInterval(() => {
        setPlaybackTime((currentTime) => {
          const nextTime = currentTime + step;
          if (nextTime >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return nextTime;
        });
      }, interval);
    } else if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, totalDuration, playbackSettings.speed]);

  // Update playback content when time changes
  useEffect(() => {
    updatePlaybackAtTime(playbackTime);
  }, [playbackTime, updatePlaybackAtTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "CONTENT_SNAPSHOT":
        return IconFileText;
      case "FOCUS_IN":
        return IconEye;
      case "FOCUS_OUT":
        return IconEyeOff;
      default:
        return IconClock;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "CONTENT_SNAPSHOT":
        return "blue";
      case "FOCUS_IN":
        return "green";
      case "FOCUS_OUT":
        return "gray";
      default:
        return "blue";
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <AppShellLayout>
        <Container size="xl">
          <Text>Loading submission...</Text>
        </Container>
      </AppShellLayout>
    );
  }

  if (!submission) {
    return (
      <AppShellLayout>
        <Container size="xl">
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Submission Not Found"
            color="red"
          >
            The submission you're looking for doesn't exist or you don't have
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
                  href="/submissions"
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  Back to Submissions
                </Button>
                <Badge
                  color={getStatusColor(submission.status)}
                  variant="light"
                >
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
                    onClick={() => handleStatusUpdate("ACCEPTED")}
                    loading={updateStatusMutation.isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    color="red"
                    variant="outline"
                    leftSection={<IconX size={16} />}
                    onClick={() => handleStatusUpdate("REJECTED")}
                    loading={updateStatusMutation.isPending}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                leftSection={<IconDownload size={16} />}
              >
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

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="review">Code Review</Tabs.Tab>
              <Tabs.Tab value="playback">Keystroke Playback</Tabs.Tab>
              <Tabs.Tab value="timeline">Event Timeline</Tabs.Tab>
              <Tabs.Tab value="comments">
                Comments ({submission.comments.length})
              </Tabs.Tab>
            </Tabs.List>

            {/* Code Review Tab */}
            <Tabs.Panel value="review" pt="lg">
              <Card withBorder p="lg">
                <Title order={3} mb="md">
                  Final Submission
                </Title>
                <Textarea
                  value={submission.content}
                  readOnly
                  autosize
                  minRows={20}
                  maxRows={30}
                  styles={{
                    input: {
                      fontFamily: "Monaco, Menlo, monospace",
                      fontSize: "14px",
                      backgroundColor: "#f8f9fa",
                    },
                  }}
                />
              </Card>
            </Tabs.Panel>

            {/* Keystroke Playback Tab */}
            <Tabs.Panel value="playback" pt="lg">
              <Stack gap="md">
                {/* Playback Controls */}
                <Card withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <Title order={4}>Playback Controls</Title>
                    <Button
                      variant="subtle"
                      size="sm"
                      leftSection={<IconSettings size={16} />}
                      onClick={openSettings}
                    >
                      Settings
                    </Button>
                  </Group>

                  <Group mb="md">
                    <ActionIcon
                      variant="filled"
                      size="lg"
                      onClick={isPlaying ? pausePlayback : startPlayback}
                      disabled={totalDuration === 0}
                    >
                      {isPlaying ? (
                        <IconPlayerPause size={20} />
                      ) : (
                        <IconPlayerPlay size={20} />
                      )}
                    </ActionIcon>

                    <ActionIcon variant="outline" onClick={() => skipToTime(0)}>
                      <IconPlayerSkipBack size={16} />
                    </ActionIcon>

                    <ActionIcon
                      variant="outline"
                      onClick={() =>
                        skipToTime(
                          Math.min(playbackTime + 30000, totalDuration),
                        )
                      }
                    >
                      <IconPlayerSkipForward size={16} />
                    </ActionIcon>

                    <ActionIcon variant="outline" onClick={resetPlayback}>
                      Reset
                    </ActionIcon>
                  </Group>

                  <Group mb="md">
                    <Text size="sm">Time:</Text>
                    <Text size="sm" fw={500}>
                      {formatDuration(playbackTime)} /{" "}
                      {formatDuration(totalDuration)}
                    </Text>
                    <Text size="sm">Speed: {playbackSettings.speed}x</Text>
                    {playbackSettings.showFocusChanges && (
                      <Badge
                        color={isWindowFocused ? "green" : "red"}
                        variant="light"
                        leftSection={
                          isWindowFocused ? (
                            <IconEye size={12} />
                          ) : (
                            <IconEyeOff size={12} />
                          )
                        }
                      >
                        {isWindowFocused ? "Focused" : "Not Focused"}
                      </Badge>
                    )}
                  </Group>

                  <Slider
                    value={playbackTime}
                    onChange={skipToTime}
                    max={totalDuration}
                    min={0}
                    step={1000}
                    marks={[
                      { value: 0, label: "Start" },
                      { value: totalDuration, label: "End" },
                    ]}
                    mb="md"
                  />
                </Card>

                {/* Playback Content */}
                <Card withBorder p="lg">
                  <Group justify="space-between" mb="md">
                    <Title order={4}>Live Playback</Title>
                    <Text size="sm" c="dimmed">
                      Speed: {playbackSettings.speed}x
                    </Text>
                  </Group>

                  <Textarea
                    ref={playbackTextareaRef}
                    value={playbackContent}
                    readOnly
                    autosize
                    minRows={20}
                    maxRows={30}
                    styles={{
                      input: {
                        fontFamily: "Monaco, Menlo, monospace",
                        fontSize: "14px",
                        backgroundColor: isWindowFocused
                          ? "#ffffff"
                          : "#f1f3f4",
                        border: isWindowFocused
                          ? "2px solid #3b82f6"
                          : "2px solid #ef4444",
                      },
                    }}
                  />
                </Card>
              </Stack>
            </Tabs.Panel>

            {/* Event Timeline Tab */}
            <Tabs.Panel value="timeline" pt="lg">
              <Card withBorder p="lg">
                <Title order={3} mb="md">
                  Event Timeline
                </Title>

                {events.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No events recorded for this submission.
                  </Text>
                ) : (
                  <Stack gap="lg">
                    {/* Summary Stats */}
                    <Group>
                      <Text size="sm">
                        <strong>{contentSnapshots.length}</strong> content
                        snapshots
                      </Text>
                      <Text size="sm">
                        <strong>{focusEvents.length}</strong> focus changes
                      </Text>
                      <Text size="sm">
                        <strong>{formatDuration(totalDuration)}</strong> total
                        duration
                      </Text>
                    </Group>

                    <Timeline active={-1} bulletSize={24} lineWidth={2}>
                      {events.map((event, index) => {
                        const EventIcon = getEventIcon(event.type);
                        const eventTime = playbackStartTime
                          ? new Date(event.timestamp).getTime() -
                            playbackStartTime.getTime()
                          : 0;

                        return (
                          <Timeline.Item
                            key={`${event.type}-${event.timestamp}-${index}`}
                            bullet={<EventIcon size={12} />}
                            color={getEventColor(event.type)}
                            title={
                              <Group gap="xs">
                                <Text size="sm" fw={500}>
                                  {event.type === "CONTENT_SNAPSHOT"
                                    ? "Content Update"
                                    : event.type
                                        .replace("_", " ")
                                        .toLowerCase()}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  +{formatDuration(eventTime)}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  ({formatTime(event.timestamp.toString())})
                                </Text>
                              </Group>
                            }
                          >
                            {event.type === "CONTENT_SNAPSHOT" &&
                              event.content && (
                                <Stack gap="xs" mt="xs">
                                  <Text size="xs" c="dimmed">
                                    Content length: {event.content.length}{" "}
                                    characters
                                  </Text>
                                  {event.content.length > 100 ? (
                                    <Code block>
                                      {event.content.substring(0, 100)}...
                                    </Code>
                                  ) : (
                                    <Code block>
                                      {event.content || "(empty)"}
                                    </Code>
                                  )}
                                </Stack>
                              )}
                            {event.cursorStart && (
                              <Text size="xs" c="dimmed" mt="xs">
                                Cursor position: {event.cursorStart}
                                {event.cursorEnd &&
                                  event.cursorEnd !== event.cursorStart &&
                                  ` (selection: ${event.cursorEnd - event.cursorStart} chars)`}
                              </Text>
                            )}
                            {(event.type === "FOCUS_OUT" ||
                              event.type === "FOCUS_IN") && (
                              <Text size="xs" c="dimmed" mt="xs">
                                Window{" "}
                                {event.type === "FOCUS_IN" ? "gained" : "lost"}{" "}
                                focus
                              </Text>
                            )}
                          </Timeline.Item>
                        );
                      })}
                    </Timeline>
                  </Stack>
                )}
              </Card>
            </Tabs.Panel>

            {/* Comments Tab */}
            <Tabs.Panel value="comments" pt="lg">
              <Stack gap="md">
                {/* Add Comment */}
                <Card withBorder p="lg">
                  <Title order={4} mb="md">
                    Add Comment
                  </Title>
                  <form onSubmit={commentForm.onSubmit(handleAddComment)}>
                    <Stack gap="md">
                      <Textarea
                        placeholder="Write your review comments here..."
                        autosize
                        minRows={3}
                        {...commentForm.getInputProps("content")}
                      />
                      <Group justify="flex-end">
                        <Button
                          type="submit"
                          leftSection={<IconSend size={16} />}
                          loading={addCommentMutation.isPending}
                        >
                          Add Comment
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                </Card>

                {/* Comments List */}
                <Card withBorder p="lg">
                  <Title order={4} mb="md">
                    Review Comments
                  </Title>

                  {submission.comments.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                      No comments yet. Add the first comment to start the review
                      discussion.
                    </Text>
                  ) : (
                    <Stack gap="md">
                      {submission.comments.map((comment) => (
                        <div key={comment.id}>
                          <Group mb="xs">
                            <Avatar size="sm" radius="xl">
                              {comment.author.name?.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text size="sm" fw={500}>
                                {comment.author.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {new Date(comment.createdAt).toLocaleString()}
                              </Text>
                            </div>
                          </Group>
                          <Text
                            size="sm"
                            style={{
                              marginLeft:
                                "calc(var(--mantine-spacing-sm) + 32px)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {comment.content}
                          </Text>
                          {comment.id !==
                            submission.comments[submission.comments.length - 1]
                              ?.id && <Divider my="md" />}
                        </div>
                      ))}
                    </Stack>
                  )}
                </Card>
              </Stack>
            </Tabs.Panel>
          </Tabs>

          {/* Playback Settings Modal */}
          <Modal
            opened={settingsOpened}
            onClose={closeSettings}
            title="Playback Settings"
            size="sm"
          >
            <Stack gap="md">
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Playback Speed
                </Text>
                <Select
                  data={[
                    { value: "0.25", label: "0.25x" },
                    { value: "0.5", label: "0.5x" },
                    { value: "1", label: "1x (Normal)" },
                    { value: "2", label: "2x" },
                    { value: "4", label: "4x" },
                    { value: "8", label: "8x" },
                  ]}
                  value={playbackSettings.speed.toString()}
                  onChange={(value) =>
                    setPlaybackSettings({
                      ...playbackSettings,
                      speed: Number.parseFloat(value || "1"),
                    })
                  }
                />
              </div>

              <Text size="sm" c="dimmed">
                Adjust playback speed to review the submission at your preferred
                pace.
              </Text>

              <Group justify="flex-end" mt="md">
                <Button onClick={closeSettings}>Done</Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      </Container>
    </AppShellLayout>
  );
}
