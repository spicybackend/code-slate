export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function getStatusColor(status: string): string {
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

export function getEventIcon(eventType: string) {
  const {
    IconEdit,
    IconEye,
    IconEyeOff,
    IconKeyboard,
  } = require("@tabler/icons-react");

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

export function getEventColor(eventType: string): string {
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
