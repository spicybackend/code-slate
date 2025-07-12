"use client";

import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Progress,
  Stack,
  Text,
  Textarea,
  Title,
  Badge,
  Modal,
  Loader,
} from "@mantine/core";
import { useDisclosure, useInterval } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconClock,
  IconSend,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

interface KeystrokeEvent {
  type:
    | "FOCUS_IN"
    | "FOCUS_OUT"
    | "TYPING"
    | "COPY"
    | "PASTE"
    | "DELETE"
    | "SELECTION_CHANGE";
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
  const [events, setEvents] = useState<KeystrokeEvent[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [
    submitModalOpened,
    { open: openSubmitModal, close: closeSubmitModal },
  ] = useDisclosure(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSaveRef = useRef<Date>(new Date());
  const eventsBufferRef = useRef<KeystrokeEvent[]>([]);

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

  // Window focus tracking
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      addEvent({
        type: "FOCUS_IN",
        timestamp: new Date(),
        windowFocus: true,
      });
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      addEvent({
        type: "FOCUS_OUT",
        timestamp: new Date(),
        windowFocus: false,
      });
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Add keystroke event
  const addEvent = useCallback((event: KeystrokeEvent) => {
    setEvents((prev) => [...prev, event]);
    eventsBufferRef.current.push(event);
  }, []);

  // Auto-save content and events
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (eventsBufferRef.current.length > 0 && !isSubmitted) {
        // Send events to server
        addKeystrokeEventMutation.mutate({
          token,
          events: eventsBufferRef.current,
        });
        eventsBufferRef.current = [];
      }

      // Save content if changed
      if (content !== submission?.content && !isSubmitted) {
        updateContentMutation.mutate({
          token,
          content,
        });
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [
    content,
    submission?.content,
    token,
    isSubmitted,
    addKeystrokeEventMutation,
    updateContentMutation,
  ]);

  // Textarea event handlers
  const handleTextareaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (isSubmitted) return;

    const newContent = event.target.value;
    const cursorPosition = event.target.selectionStart;

    setContent(newContent);
    setIsTyping(true);

    // Determine if content was added or removed
    const lengthDiff = newContent.length - content.length;

    addEvent({
      type: lengthDiff > 0 ? "TYPING" : "DELETE",
      timestamp: new Date(),
      cursorStart: cursorPosition - Math.abs(lengthDiff),
      cursorEnd: cursorPosition,
      content:
        lengthDiff > 0
          ? newContent.slice(cursorPosition - lengthDiff, cursorPosition)
          : "",
      windowFocus: isWindowFocused,
    });

    // Clear typing indicator after 2 seconds
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleCopy = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = content.slice(start, end);

      addEvent({
        type: "COPY",
        timestamp: new Date(),
        cursorStart: start,
        cursorEnd: end,
        content: selectedText,
        windowFocus: isWindowFocused,
      });
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    if (isSubmitted) return;

    const pastedText = event.clipboardData.getData("text");
    const cursorPosition = textareaRef.current?.selectionStart || 0;

    addEvent({
      type: "PASTE",
      timestamp: new Date(),
      cursorStart: cursorPosition,
      cursorEnd: cursorPosition,
      content: pastedText,
      windowFocus: isWindowFocused,
    });
  };

  const handleSelectionChange = () => {
    if (textareaRef.current && !isSubmitted) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;

      if (start !== end) {
        addEvent({
          type: "SELECTION_CHANGE",
          timestamp: new Date(),
          cursorStart: start,
          cursorEnd: end,
          windowFocus: isWindowFocused,
        });
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({ token });
      setIsSubmitted(true);
      closeSubmitModal();
      notifications.show({
        title: "Submission Successful",
        message: "Your solution has been submitted successfully!",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Submission Failed",
        message:
          "There was an error submitting your solution. Please try again.",
        color: "red",
      });
    }
  };

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
  }, [isTimeUp, isSubmitted, submission?.status]);

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
              value={(elapsedTime / (challenge.timeLimit! * 60)) * 100}
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
            onCopy={handleCopy}
            onPaste={handlePaste}
            onSelect={handleSelectionChange}
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
