import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";

export const metadata: Metadata = {
  title: "AWS LPU Interview Scheduling",
  description: "Schedule and manage interviews for the AWS LPU recruitment team.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<ToastProvider /></body>
    </html>
  );
}
