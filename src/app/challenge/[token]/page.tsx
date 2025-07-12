"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  Progress,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure, useInterval } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconClock,
  IconEye,
  IconEyeOff,
  IconSend,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTO_SAVE_INTERVAL,
  CONTENT_SNAPSHOT_INTERVAL,
  TYPING_INDICATOR_TIMEOUT,
} from "~/lib/constants/tracking";
import { api } from "~/trpc/react";
import type { EventType } from "@prisma/client";

interface KeystrokeEvent {
  type: EventType;
  timestamp: Date;
  cursorStart?: number;
  cursorEnd?: number;
  content?: string;
  windowFocus: boolean;
}

export default function ChallengePage() {
  const params = useParams();
  const token = params.token as string;

  const [content, setContent] = useState("");
  const [_events, setEvents] = useState<KeystrokeEvent[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [lastContentSnapshot, setLastContentSnapshot] = useState("");
  const [
    submitModalOpened,
    { open: openSubmitModal, close: closeSubmitModal },
  ] = useDisclosure(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const _lastSaveRef = useRef<Date>(new Date());
  const eventsBufferRef = useRef<KeystrokeEvent[]>([]);
  const lastSnapshotTimeRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventsSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Fetch challenge data
  const {
    data: challengeData,
    isLoading,
    error,
  } = api.submission.getByCandidateToken.useQuery(
    { token },
    {
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  // Mutations
  const updateContentMutation = api.submission.updateContent.useMutation();
  const addKeystrokeEventMutation =
    api.submission.addKeystrokeEvent.useMutation();
  const submitMutation = api.submission.submit.useMutation();

  // Mutation refs for stable access in intervals
  const addKeystrokeEventMutationRef = useRef(addKeystrokeEventMutation);
  const updateContentMutationRef = useRef(updateContentMutation);

  // Keep mutation refs updated
  useEffect(() => {
    addKeystrokeEventMutationRef.current = addKeystrokeEventMutation;
  }, [addKeystrokeEventMutation]);

  useEffect(() => {
    updateContentMutationRef.current = updateContentMutation;
  }, [updateContentMutation]);

  const challenge = challengeData?.challenge;
  const submission = challengeData;
  const candidate = challengeData?.candidate;
  const organization = challenge?.organization;

  // Timer
  const interval = useInterval(() => {
    if (submission?.status === "IN_PROGRESS" && isWindowFocused) {
      setElapsedTime((prev) => prev + 1);
    }
  }, 1000);

  useEffect(() => {
    if (submission?.status === "IN_PROGRESS") {
      interval.start();
    }
    return interval.stop;
  }, [submission?.status, interval]);

  // Load existing content
  useEffect(() => {
    if (submission?.content) {
      setContent(submission.content);
      setLastContentSnapshot(submission.content);
      lastSavedContentRef.current = submission.content;
    }
    if (submission?.status === "SUBMITTED") {
      setIsSubmitted(true);
    }
    if (submission?.startedAt) {
      const startTime = new Date(submission.startedAt).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }
  }, [submission]);

  // Add keystroke event
  const addEvent = useCallback((event: KeystrokeEvent) => {
    setEvents((prev) => [...prev, event]);
    eventsBufferRef.current.push(event);
  }, []);

  // Add content snapshot (throttled)
  const addContentSnapshot = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSnapshot = now - lastSnapshotTimeRef.current;

    if (timeSinceLastSnapshot >= CONTENT_SNAPSHOT_INTERVAL) {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      addEvent({
        type: "CONTENT_SNAPSHOT",
        timestamp: new Date(),
        cursorStart: cursorPos,
        cursorEnd: cursorPos,
        content: content,
        windowFocus: isWindowFocused,
      });
      setLastContentSnapshot(content);
      lastSnapshotTimeRef.current = now;
    }
  }, [content, isWindowFocused, addEvent]);

  // Window focus tracking
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      addEvent({
        type: "FOCUS_IN",
        timestamp: new Date(),
        cursorStart: textareaRef.current?.selectionStart || 0,
        cursorEnd: textareaRef.current?.selectionEnd || 0,
        windowFocus: true,
      });
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      addEvent({
        type: "FOCUS_OUT",
        timestamp: new Date(),
        cursorStart: textareaRef.current?.selectionStart || 0,
        cursorEnd: textareaRef.current?.selectionEnd || 0,
        windowFocus: false,
      });
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [addEvent]);

  // Content change effect for snapshots
  useEffect(() => {
    if (content !== lastContentSnapshot && !isSubmitted) {
      addContentSnapshot();
    }
  }, [content, lastContentSnapshot, isSubmitted, addContentSnapshot]);

  // Auto-save events (throttled)
  useEffect(() => {
    if (!isSubmitted) {
      eventsSaveIntervalRef.current = setInterval(() => {
        if (eventsBufferRef.current.length > 0) {
          // Send events to server
          const eventsToSave = [...eventsBufferRef.current];
          eventsBufferRef.current = [];

          addKeystrokeEventMutationRef.current.mutate(
            {
              token,
              events: eventsToSave,
            },
            {
              onError: (error) => {
                console.error("Failed to save keystroke events:", error);
                notifications.show({
                  title: "Warning",
                  message:
                    "Failed to save keystroke events. Your typing activity may not be recorded.",
                  color: "orange",
                });
                // Put events back in buffer on error to retry later
                eventsBufferRef.current.unshift(...eventsToSave);
              },
            },
          );
        }
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (eventsSaveIntervalRef.current) {
        clearInterval(eventsSaveIntervalRef.current);
        eventsSaveIntervalRef.current = null;
      }
    };
  }, [token, isSubmitted]);

  // Auto-save content (throttled)
  useEffect(() => {
    if (!isSubmitted) {
      contentSaveIntervalRef.current = setInterval(() => {
        if (content !== lastSavedContentRef.current) {
          updateContentMutationRef.current.mutate(
            {
              token,
              content,
            },
            {
              onSuccess: () => {
                lastSavedContentRef.current = content;
              },
            },
          );
        }
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (contentSaveIntervalRef.current) {
        clearInterval(contentSaveIntervalRef.current);
        contentSaveIntervalRef.current = null;
      }
    };
  }, [content, submission?.content, token, isSubmitted]);

  // Textarea event handlers
  const handleTextareaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (isSubmitted) return;

    const newContent = event.target.value;
    setContent(newContent);
    setIsTyping(true);

    // Clear existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new typing timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, TYPING_INDICATOR_TIMEOUT);
  };

  const handleSubmit = useCallback(async () => {
    try {
      await submitMutation.mutateAsync({ token });
      setIsSubmitted(true);
      closeSubmitModal();
      notifications.show({
        title: "Submission Successful",
        message: "Your solution has been submitted successfully!",
        color: "green",
      });
    } catch (_error) {
      notifications.show({
        title: "Submission Failed",
        message:
          "There was an error submitting your solution. Please try again.",
        color: "red",
      });
    }
  }, [token, submitMutation, closeSubmitModal]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeRemaining = () => {
    if (!challenge?.timeLimit || !submission?.startedAt) return null;

    const startTime = new Date(submission.startedAt).getTime();
    const timeLimit = challenge.timeLimit * 60; // Convert minutes to seconds
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, timeLimit - elapsed);

    return remaining;
  };

  const timeRemaining = getTimeRemaining();
  const isTimeUp = timeRemaining === 0;

  // Auto-submit when time is up
  useEffect(() => {
    if (isTimeUp && !isSubmitted && submission?.status === "IN_PROGRESS") {
      handleSubmit();
    }
  }, [isTimeUp, isSubmitted, submission?.status, handleSubmit]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (eventsSaveIntervalRef.current) {
        clearInterval(eventsSaveIntervalRef.current);
      }
      if (contentSaveIntervalRef.current) {
        clearInterval(contentSaveIntervalRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Container size="md" py={80}>
        <Stack align="center">
          <Loader size="lg" />
          <Text>Loading challenge...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !challengeData || !challenge) {
    return (
      <Container size="md" py={80}>
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Challenge Not Found"
          color="red"
        >
          The challenge link you're trying to access is invalid or has expired.
          Please check the link or contact the organization that sent it to you.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase">
                {organization?.name}
              </Text>
              <Title order={2}>{challenge?.title}</Title>
              <Text c="dimmed">
                Candidate: {candidate?.name} ({candidate?.email})
              </Text>
            </div>
            <div style={{ textAlign: "right" }}>
              <Group gap="xs" mb="xs">
                <Badge
                  color={
                    isSubmitted
                      ? "green"
                      : submission?.status === "IN_PROGRESS"
                        ? "blue"
                        : "gray"
                  }
                  variant="filled"
                >
                  {isSubmitted
                    ? "Submitted"
                    : submission?.status?.replace("_", " ") || "Not Started"}
                </Badge>
                {!isWindowFocused && !isSubmitted && (
                  <Badge color="orange" leftSection={<IconEyeOff size={12} />}>
                    Focus Lost
                  </Badge>
                )}
                {isTyping && (
                  <Badge color="blue" leftSection={<IconEye size={12} />}>
                    Typing...
                  </Badge>
                )}
              </Group>
              <Group gap="sm">
                <Text size="sm" c="dimmed">
                  <IconClock size={16} style={{ verticalAlign: "middle" }} />{" "}
                  {formatTime(elapsedTime)}
                </Text>
                {timeRemaining !== null && (
                  <Text size="sm" c={timeRemaining < 300 ? "red" : "dimmed"}>
                    Time remaining: {formatTime(timeRemaining)}
                  </Text>
                )}
              </Group>
            </div>
          </Group>

          {timeRemaining !== null && (
            <Progress
              value={(elapsedTime / ((challenge.timeLimit ?? 60) * 60)) * 100}
              color={timeRemaining < 300 ? "red" : "blue"}
              mt="md"
            />
          )}
        </Card>

        {/* Challenge Description */}
        <Card withBorder p="md">
          <Title order={3} mb="md">
            Challenge Instructions
          </Title>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {challenge?.instructions}
          </div>
        </Card>

        {/* Code Editor */}
        <Card withBorder p="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Your Solution</Title>
            <Group>
              {updateContentMutation.isPending && (
                <Text size="xs" c="dimmed">
                  Saving...
                </Text>
              )}
              {!isSubmitted && (
                <Button
                  onClick={openSubmitModal}
                  leftSection={<IconSend size={16} />}
                  disabled={!content.trim() || isTimeUp}
                >
                  Submit Solution
                </Button>
              )}
            </Group>
          </Group>

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            placeholder={
              isSubmitted ? "Solution submitted" : "Write your code here..."
            }
            minRows={20}
            maxRows={30}
            autosize
            disabled={isSubmitted || isTimeUp}
            styles={{
              input: {
                fontFamily: "Monaco, Menlo, monospace",
                fontSize: "14px",
              },
            }}
          />

          {isSubmitted && (
            <Alert color="green" mt="md" icon={<IconAlertCircle size="1rem" />}>
              Your solution has been submitted successfully. The hiring team
              will review it and get back to you.
            </Alert>
          )}

          {isTimeUp && !isSubmitted && (
            <Alert color="red" mt="md" icon={<IconAlertCircle size="1rem" />}>
              Time is up! Your solution will be automatically submitted.
            </Alert>
          )}
        </Card>

        {/* Submission Confirmation Modal */}
        <Modal
          opened={submitModalOpened}
          onClose={closeSubmitModal}
          title="Submit Solution"
          centered
        >
          <Stack>
            <Text>
              Are you sure you want to submit your solution? Once submitted, you
              won't be able to make any changes.
            </Text>
            <Group justify="flex-end">
              <Button variant="outline" onClick={closeSubmitModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                loading={submitMutation.isPending}
                leftSection={<IconSend size={16} />}
              >
                Submit Solution
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
