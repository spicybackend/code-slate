"use client";

import { Alert, Container, Stack, Tabs, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShellLayout } from "~/components/AppShell";
import { api } from "~/trpc/react";
import {
  CodeReviewTab,
  CommentsTab,
  EventTimelineTab,
  KeystrokePlaybackTab,
  PlaybackSettingsModal,
  SubmissionHeader,
} from "./components";

interface PlaybackSettings {
  speed: number;
  showCursor: boolean;
  showFocusChanges: boolean;
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
  const [isShowingFinalSubmission, setIsShowingFinalSubmission] =
    useState(false);

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
    setPlaybackStartTime(
      events.length > 0 ? new Date(events[0]?.timestamp || 0) : null,
    );

    // Start with empty content - content will be populated by updatePlaybackAtTime(0)
    setPlaybackContent("");
    setCursorPosition(0);

    // Initialize focus state - assume focused at start unless first event is FOCUS_OUT
    let initialFocusState = true;
    if (focusEvents.length > 0 && events.length > 0) {
      const startTime = new Date(events[0]?.timestamp || 0).getTime();
      const firstFocusEvent = focusEvents[0];
      // If the first focus event is very early (within first second) and is FOCUS_OUT,
      // then we started unfocused
      if (firstFocusEvent?.type === "FOCUS_OUT") {
        const eventTime =
          new Date(firstFocusEvent.timestamp).getTime() - startTime;
        if (eventTime < 1000) {
          initialFocusState = false;
        }
      }
    }
    setIsWindowFocused(initialFocusState);

    if (playbackTextareaRef.current) {
      playbackTextareaRef.current.value = "";
      if (playbackSettings.showCursor) {
        playbackTextareaRef.current.setSelectionRange(0, 0);
      }
    }
  }, [events, focusEvents, playbackSettings]);

  const updatePlaybackAtTime = useCallback(
    (targetTime: number) => {
      if (!playbackStartTime) return;

      const targetTimestamp = new Date(
        playbackStartTime.getTime() + targetTime,
      );

      // Check if playback time is at the maximum (end of events) to show final submission
      const isAtMaxTime = targetTime >= totalDuration && totalDuration > 0;
      setIsShowingFinalSubmission(isAtMaxTime);

      // Update content and cursor
      let newContent = "";
      let newCursorPos = 0;

      if (isAtMaxTime && submission?.content) {
        // Show final submission content when at max time
        newContent = submission.content;
        newCursorPos = newContent.length;
      } else {
        // Find the most recent content snapshot before or at target time
        const relevantSnapshot = [...contentSnapshots]
          .reverse()
          .find((event) => new Date(event.timestamp) <= targetTimestamp);

        if (relevantSnapshot) {
          newContent = relevantSnapshot.content || "";
          newCursorPos = relevantSnapshot.cursorStart || 0;
        }
      }

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
    [
      playbackStartTime,
      contentSnapshots,
      focusEvents,
      playbackSettings,
      totalDuration,
      submission?.content,
    ],
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

  const handleAddComment = (values: { content: string }) => {
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

  // Initialize playback state when events data loads
  useEffect(() => {
    if (events.length > 0 && !playbackStartTime) {
      resetPlayback();
    }
  }, [events, playbackStartTime, resetPlayback]);

  // Initialize display after resetPlayback completes
  useEffect(() => {
    if (playbackStartTime && events.length > 0 && playbackTime === 0) {
      updatePlaybackAtTime(0);
    }
  }, [playbackStartTime, events, updatePlaybackAtTime, playbackTime]);

  // Update playback display when playback time changes
  useEffect(() => {
    if (playbackStartTime && events.length > 0) {
      updatePlaybackAtTime(playbackTime);
    }
  }, [playbackTime, playbackStartTime, events, updatePlaybackAtTime]);

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
          <SubmissionHeader
            submission={{
              id: submission.id,
              status: submission.status as
                | "SUBMITTED"
                | "ACCEPTED"
                | "REJECTED",
              candidate: {
                name: submission.candidate.name,
                email: submission.candidate.email,
                position: submission.candidate.position || undefined,
              },
              challenge: {
                title: submission.challenge.title,
              },
              totalTimeSpent: submission.totalTimeSpent || undefined,
              submittedAt: submission.submittedAt || undefined,
            }}
            onStatusUpdate={handleStatusUpdate}
            isUpdatingStatus={updateStatusMutation.isPending}
          />

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
              <CodeReviewTab
                content={submission.content}
                language={submission.language || "jsx"}
              />
            </Tabs.Panel>

            {/* Keystroke Playback Tab */}
            <Tabs.Panel value="playback" pt="lg">
              <KeystrokePlaybackTab
                isPlaying={isPlaying}
                playbackTime={playbackTime}
                playbackContent={playbackContent}
                playbackSettings={playbackSettings}
                isWindowFocused={isWindowFocused}
                playbackStartTime={playbackStartTime}
                language={submission.language || "jsx"}
                isShowingFinalSubmission={isShowingFinalSubmission}
                focusEvents={focusEvents.map((e) => ({
                  type: e.type,
                  timestamp: e.timestamp,
                  content: e.content || undefined,
                  cursorStart: e.cursorStart || undefined,
                  cursorEnd: e.cursorEnd || undefined,
                }))}
                totalDuration={totalDuration}
                startPlayback={startPlayback}
                pausePlayback={pausePlayback}
                skipToTime={skipToTime}
                resetPlayback={resetPlayback}
                openSettings={openSettings}
                playbackTextareaRef={playbackTextareaRef}
              />
            </Tabs.Panel>

            {/* Event Timeline Tab */}
            <Tabs.Panel value="timeline" pt="lg">
              <EventTimelineTab
                events={events.map((e) => ({
                  type: e.type,
                  timestamp: e.timestamp,
                  content: e.content || undefined,
                  cursorStart: e.cursorStart || undefined,
                  cursorEnd: e.cursorEnd || undefined,
                }))}
                contentSnapshots={contentSnapshots.map((e) => ({
                  type: e.type,
                  timestamp: e.timestamp,
                  content: e.content || undefined,
                  cursorStart: e.cursorStart || undefined,
                  cursorEnd: e.cursorEnd || undefined,
                }))}
                focusEvents={focusEvents.map((e) => ({
                  type: e.type,
                  timestamp: e.timestamp,
                  content: e.content || undefined,
                  cursorStart: e.cursorStart || undefined,
                  cursorEnd: e.cursorEnd || undefined,
                }))}
                totalDuration={totalDuration}
                playbackStartTime={playbackStartTime}
              />
            </Tabs.Panel>

            {/* Comments Tab */}
            <Tabs.Panel value="comments" pt="lg">
              <CommentsTab
                comments={submission.comments.map((c) => ({
                  id: c.id,
                  content: c.content,
                  createdAt: c.createdAt,
                  author: {
                    name: c.author.name || undefined,
                  },
                }))}
                onAddComment={handleAddComment}
                isAddingComment={addCommentMutation.isPending}
              />
            </Tabs.Panel>
          </Tabs>

          <PlaybackSettingsModal
            opened={settingsOpened}
            onClose={closeSettings}
            settings={playbackSettings}
            onSettingsChange={setPlaybackSettings}
          />
        </Stack>
      </Container>
    </AppShellLayout>
  );
}
