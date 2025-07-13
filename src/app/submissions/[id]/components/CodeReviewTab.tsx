"use client";

import { Card, Title } from "@mantine/core";
import CodeEditor from "@uiw/react-textarea-code-editor";

interface CodeReviewTabProps {
  content: string;
  language: string;
}

export function CodeReviewTab({ content, language }: CodeReviewTabProps) {
  console.log({ language, content });
  return (
    <Card withBorder p="lg">
      <Title order={3} mb="md">
        Final Submission
      </Title>
      <CodeEditor
        value={content}
        language={language}
        readOnly
        padding={15}
        data-color-mode="light"
        style={{
          fontSize: 14,
          fontFamily: "Monaco, Menlo, monospace",
          backgroundColor: "#f8f9fa",
          borderRadius: "6px",
          minHeight: "500px",
        }}
      />
    </Card>
  );
}
