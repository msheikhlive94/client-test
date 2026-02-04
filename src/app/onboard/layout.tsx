import type { Metadata } from "next";
import { appConfig } from "@/lib/config/theme";

export const metadata: Metadata = {
  title: `Get Started | ${appConfig.name}`,
  description: "Tell us about your project",
};

export default function OnboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
