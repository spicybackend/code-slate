"use client";

import {
  Avatar,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconSend } from "@tabler/icons-react";

interface CommentFormData {
  content: string;
}

interface Author {
  name?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  author: Author;
}

interface CommentsTabProps {
  comments: Comment[];
  onAddComment: (values: CommentFormData) => void;
  isAddingComment: boolean;
}

export function CommentsTab({
  comments,
  onAddComment,
  isAddingComment,
}: CommentsTabProps) {
  const commentForm = useForm<CommentFormData>({
    initialValues: {
      content: "",
    },
    validate: {
      content: (value) => (value.length < 1 ? "Comment is required" : null),
    },
  });

  const handleSubmit = (values: CommentFormData) => {
    onAddComment(values);
    commentForm.reset();
  };

  return (
    <Stack gap="md">
      {/* Add Comment */}
      <Card withBorder p="lg">
        <Title order={4} mb="md">
          Add Comment
        </Title>
        <form onSubmit={commentForm.onSubmit(handleSubmit)}>
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
                loading={isAddingComment}
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

        {comments.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No comments yet. Add the first comment to start the review
            discussion.
          </Text>
        ) : (
          <Stack gap="md">
            {comments.map((comment, index) => (
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
                    marginLeft: "calc(var(--mantine-spacing-sm) + 32px)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {comment.content}
                </Text>
                {index !== comments.length - 1 && <Divider my="md" />}
              </div>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
