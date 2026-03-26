import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "GiggleBox Dashboard",
  description: "Parent dashboard for GiggleBox child setup, sync, and activity."
};

export const viewport: Viewport = {
  themeColor: "#7c3aed"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
