import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DroneView Ops",
  description: "Proposals, vendor quotes and projects for DroneView Technologies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
