import type { Metadata } from "next";
import { appConfig } from "@/lib/config/theme";

export const metadata: Metadata = {
  title: `Client Portal | ${appConfig.name}`,
  description: "View your projects and track progress",
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
