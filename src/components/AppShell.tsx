"use client";

import {
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  rem,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconClipboardList,
  IconDashboard,
  IconLogout,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

interface AppShellLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  {
    label: "Dashboard",
    icon: IconDashboard,
    href: "/dashboard",
  },
  {
    label: "Challenges",
    icon: IconClipboardList,
    href: "/challenges",
  },
  {
    label: "Submissions",
    icon: IconClipboardList,
    href: "/submissions",
  },
  {
    label: "Organization",
    icon: IconUsers,
    href: "/organization",
  },
];

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text size="xl" fw={700}>
              Code Slate
            </Text>
          </Group>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar
                    src={session?.user?.image}
                    alt={session?.user?.name || "User"}
                    radius="xl"
                    size="sm"
                  />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {session?.user?.name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {session?.user?.role?.toLowerCase()}
                    </Text>
                  </div>
                  <IconChevronDown
                    style={{ width: rem(12), height: rem(12) }}
                    stroke={1.5}
                  />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item
                leftSection={
                  <IconSettings style={{ width: rem(14), height: rem(14) }} />
                }
                component={Link}
                href="/settings"
              >
                Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={
                  <IconLogout style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={handleSignOut}
              >
                Sign Out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow my="md" component={ScrollArea}>
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size="1rem" stroke={1.5} />}
              active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
              variant="filled"
              mb="xs"
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
