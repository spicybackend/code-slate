import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";
import "@uiw/react-textarea-code-editor/dist.css";
import "~/styles/globals.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Code Slate",
  description: "Code challenge platform for technical interviews",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body className={geist.className}>
        <SessionProvider>
          <TRPCReactProvider>
            <MantineProvider>
              <ModalsProvider>
                <Notifications />
                {children}
              </ModalsProvider>
            </MantineProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
