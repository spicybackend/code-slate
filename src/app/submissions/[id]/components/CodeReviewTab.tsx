"use client";

import { Card, Textarea, Title } from "@mantine/core";

interface CodeReviewTabProps {
  content: string;
}

export function CodeReviewTab({ content }: CodeReviewTabProps) {
  return (
    <Card withBorder p="lg">
      <Title order={3} mb="md">
        Final Submission
      </Title>
      <Textarea
        value={content}
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
  );
}
