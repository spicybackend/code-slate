"use client";

import { Card, Code, Group, Stack, Text, Timeline, Title } from "@mantine/core";
import {
  IconEdit,
  IconEye,
  IconEyeOff,
  IconKeyboard,
} from "@tabler/icons-react";

interface Event {
  type: string;
  timestamp: Date;
  content?: string;
  cursorStart?: number;
  cursorEnd?: number;
}

interface EventTimelineTabProps {
  events: Event[];
  contentSnapshots: Event[];
  focusEvents: Event[];
  eventsDuration: number;
  playbackStartTime: Date | null;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "CONTENT_SNAPSHOT":
      return IconEdit;
    case "FOCUS_IN":
      return IconEye;
    case "FOCUS_OUT":
      return IconEyeOff;
    default:
      return IconKeyboard;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "CONTENT_SNAPSHOT":
      return "blue";
    case "FOCUS_IN":
      return "green";
    case "FOCUS_OUT":
      return "red";
    default:
      return "gray";
  }
}

export function EventTimelineTab({
  events,
  contentSnapshots,
  focusEvents,
  eventsDuration,
  playbackStartTime,
}: EventTimelineTabProps) {
  if (events.length === 0) {
    return (
      <Card withBorder p="lg">
        <Title order={3} mb="md">
          Event Timeline
        </Title>
        <Text c="dimmed" ta="center" py="xl">
          No events recorded for this submission.
        </Text>
      </Card>
    );
  }

  return (
    <Card withBorder p="lg">
      <Title order={3} mb="md">
        Event Timeline
      </Title>

      <Stack gap="lg">
        {/* Summary Stats */}
        <Group>
          <Text size="sm">
            <strong>{contentSnapshots.length}</strong> content snapshots
          </Text>
          <Text size="sm">
            <strong>{focusEvents.length}</strong> focus changes
          </Text>
          <Text size="sm">
            <strong>{formatDuration(eventsDuration)}</strong> total duration
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
                        : event.type.replace("_", " ").toLowerCase()}
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
                {event.type === "CONTENT_SNAPSHOT" && event.content && (
                  <Stack gap="xs" mt="xs">
                    <Text size="xs" c="dimmed">
                      Content length: {event.content.length} characters
                    </Text>
                    {event.content.length > 100 ? (
                      <Code block>{event.content.substring(0, 100)}...</Code>
                    ) : (
                      <Code block>{event.content || "(empty)"}</Code>
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
                {(event.type === "FOCUS_OUT" || event.type === "FOCUS_IN") && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Window {event.type === "FOCUS_IN" ? "gained" : "lost"} focus
                  </Text>
                )}
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Stack>
    </Card>
  );
}
