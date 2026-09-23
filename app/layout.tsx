import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS LPU Interview Scheduling",
  description: "Schedule and manage interviews for the AWS LPU recruitment team.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
