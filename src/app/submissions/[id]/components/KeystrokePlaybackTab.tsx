"use client";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Slider,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconEye,
  IconEyeOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconRestore,
  IconRewindBackward30,
  IconRewindForward30,
  IconSettings,
} from "@tabler/icons-react";
import CodeEditor from "@uiw/react-textarea-code-editor";

interface PlaybackSettings {
  speed: number;
  showCursor: boolean;
  showFocusChanges: boolean;
}

interface Event {
  type: string;
  timestamp: Date;
  content?: string;
  cursorStart?: number;
  cursorEnd?: number;
}

interface KeystrokePlaybackTabProps {
  // Playback state
  isPlaying: boolean;
  playbackTime: number;
  playbackContent: string;
  playbackSettings: PlaybackSettings;
  isWindowFocused: boolean;
  playbackStartTime: Date | null;
  language: string;
  isShowingFinalSubmission: boolean;

  // Events data
  focusEvents: Event[];
  totalDuration: number;
  eventsDuration: number;

  // Control functions
  startPlayback: () => void;
  pausePlayback: () => void;
  skipToTime: (timeMs: number) => void;
  resetPlayback: () => void;
  openSettings: () => void;

  // Ref
  playbackTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function KeystrokePlaybackTab({
  isPlaying,
  playbackTime,
  playbackContent,
  playbackSettings,
  isWindowFocused,
  playbackStartTime,
  language,
  isShowingFinalSubmission,
  focusEvents,
  totalDuration,
  eventsDuration,
  startPlayback,
  pausePlayback,
  skipToTime,
  resetPlayback,
  openSettings,
  playbackTextareaRef,
}: KeystrokePlaybackTabProps) {
  return (
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

          <ActionIcon
            variant="outline"
            onClick={() => skipToTime(Math.max(playbackTime - 30000, 0))}
          >
            <IconRewindBackward30 size={16} />
          </ActionIcon>

          <ActionIcon
            variant="outline"
            onClick={() =>
              skipToTime(Math.min(playbackTime + 30000, totalDuration))
            }
          >
            <IconRewindForward30 size={16} />
          </ActionIcon>

          <ActionIcon variant="outline" onClick={resetPlayback}>
            <IconRestore size={16} />
          </ActionIcon>
        </Group>

        <Group mb="md">
          <Text size="sm">Time:</Text>
          <Text size="sm" fw={500}>
            {formatDuration(playbackTime)} / {formatDuration(totalDuration)}
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

        {/* Focus Loss Indicator */}
        <Box mb="xs">
          <Group justify="space-between" mb={4}>
            <Text size="sm" c="dimmed">
              Focus Timeline
            </Text>
            <Group gap="xs">
              <Group gap={4}>
                <Box
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #e9ecef",
                    borderRadius: "2px",
                  }}
                />
                <Text size="xs" c="dimmed">
                  Focused
                </Text>
              </Group>
              <Group gap={4}>
                <Box
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: "#ffc9d6",
                    borderRadius: "2px",
                  }}
                />
                <Text size="xs" c="dimmed">
                  Unfocused
                </Text>
              </Group>
            </Group>
          </Group>
          <Box
            style={{
              position: "relative",
              height: "24px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e9ecef",
              overflow: "hidden",
            }}
          >
            {/* Focus loss segments */}
            {(() => {
              if (!playbackStartTime || eventsDuration === 0) return null;

              const segments = [];
              let currentlyFocused = true;
              let lastTime = 0;

              // Process focus events to create segments
              for (const event of focusEvents) {
                const eventTime =
                  new Date(event.timestamp).getTime() -
                  playbackStartTime.getTime();
                const relativePosition = (eventTime / eventsDuration) * 100;

                // If we're transitioning from unfocused to focused, close the pink segment
                if (!currentlyFocused && event.type === "FOCUS_IN") {
                  const lastPosition = (lastTime / eventsDuration) * 100;
                  segments.push(
                    <Box
                      key={`unfocused-${lastTime}-${eventTime}`}
                      style={{
                        position: "absolute",
                        left: `${Math.max(0, lastPosition)}%`,
                        width: `${Math.min(100, relativePosition) - Math.max(0, lastPosition)}%`,
                        height: "100%",
                        backgroundColor: "#ffc9d6",
                        borderRadius: "2px",
                      }}
                    />,
                  );
                }

                currentlyFocused = event.type === "FOCUS_IN";
                lastTime = eventTime;
              }

              // If we end unfocused, add a final segment
              if (!currentlyFocused && lastTime < eventsDuration) {
                const lastPosition = (lastTime / eventsDuration) * 100;
                segments.push(
                  <Box
                    key={`unfocused-final-${lastTime}`}
                    style={{
                      position: "absolute",
                      left: `${lastPosition}%`,
                      width: `${((eventsDuration - lastTime) / eventsDuration) * 100}%`,
                      height: "100%",
                      backgroundColor: "#ffc9d6",
                      borderRadius: "2px",
                    }}
                  />,
                );
              }

              return segments;
            })()}

            {/* Current playback position indicator */}
            <Box
              style={{
                position: "absolute",
                left: `${totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0}%`,
                width: "3px",
                height: "100%",
                backgroundColor: "#228be6",
                transform: "translateX(-1.5px)",
                borderRadius: "1px",
                boxShadow: "0 0 2px rgba(34, 139, 230, 0.5)",
              }}
            />
          </Box>

          {/* Focus Statistics */}
          {(() => {
            if (
              !playbackStartTime ||
              eventsDuration === 0 ||
              focusEvents.length === 0
            ) {
              return null;
            }

            let totalUnfocusedTime = 0;
            let currentlyFocused = true;
            let lastTime = 0;

            for (const event of focusEvents) {
              const eventTime =
                new Date(event.timestamp).getTime() -
                playbackStartTime.getTime();

              if (!currentlyFocused && event.type === "FOCUS_IN") {
                totalUnfocusedTime += eventTime - lastTime;
              }

              currentlyFocused = event.type === "FOCUS_IN";
              lastTime = eventTime;
            }

            // If ending unfocused, add remaining time
            if (!currentlyFocused) {
              totalUnfocusedTime += eventsDuration - lastTime;
            }

            const focusPercentage = (
              ((eventsDuration - totalUnfocusedTime) / eventsDuration) *
              100
            ).toFixed(1);
            const unfocusedCount = focusEvents.filter(
              (e) => e.type === "FOCUS_OUT",
            ).length;

            return (
              <Group justify="space-between" mt={4}>
                <Text size="xs" c="dimmed">
                  Focus: {focusPercentage}% of session
                </Text>
                <Text size="xs" c="dimmed">
                  Lost focus {unfocusedCount} time
                  {unfocusedCount !== 1 ? "s" : ""}
                </Text>
              </Group>
            );
          })()}
        </Box>

        <Slider
          value={playbackTime}
          onChange={skipToTime}
          max={totalDuration}
          min={0}
          marks={[
            { value: 0, label: "Start" },
            { value: eventsDuration, label: "End" },
            { value: totalDuration, label: "Submit" },
          ]}
          label={(value) => {
            const totalSeconds = Math.floor(value / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
          }}
          mb="md"
        />
      </Card>

      {/* Playback Content */}
      <Card withBorder p="lg">
        <Group justify="space-between" mb="md">
          <Title order={4}>Live Playback</Title>
          <Group gap="sm">
            {isShowingFinalSubmission && (
              <Tooltip label="Showing the final submitted code (playback has gone beyond recorded events)">
                <Badge color="blue" variant="light">
                  Final Submission
                </Badge>
              </Tooltip>
            )}
            <Text size="sm" c="dimmed">
              Speed: {playbackSettings.speed}x
            </Text>
          </Group>
        </Group>

        <CodeEditor
          ref={playbackTextareaRef}
          value={playbackContent}
          language={language}
          readOnly
          padding={15}
          data-color-mode="light"
          style={{
            fontSize: 14,
            fontFamily: "Monaco, Menlo, monospace",
            backgroundColor: isWindowFocused ? "#ffffff" : "#f1f3f4",
            border: isWindowFocused ? "2px solid #3b82f6" : "2px solid #ef4444",
            borderRadius: "6px",
            minHeight: "500px",
          }}
        />
      </Card>
    </Stack>
  );
}
