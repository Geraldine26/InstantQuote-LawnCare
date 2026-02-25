import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Instant Lawn Quote",
  description: "Multi-step instant quote flow for lawn care services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
