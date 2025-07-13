"use client";

import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";

interface PlaybackSettings {
  speed: number;
  showCursor: boolean;
  showFocusChanges: boolean;
}

interface PlaybackSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  settings: PlaybackSettings;
  onSettingsChange: (settings: PlaybackSettings) => void;
}

export function PlaybackSettingsModal({
  opened,
  onClose,
  settings,
  onSettingsChange,
}: PlaybackSettingsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
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
            value={settings.speed.toString()}
            onChange={(value) =>
              onSettingsChange({
                ...settings,
                speed: Number.parseFloat(value || "1"),
              })
            }
          />
        </div>

        <Text size="sm" c="dimmed">
          Adjust playback speed to review the submission at your preferred pace.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button onClick={onClose}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
