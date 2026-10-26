import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiggleBox Dashboard",
  description: "Parent dashboard for GiggleBox child setup, sync, and activity.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "GiggleBox", statusBarStyle: "default" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] }
};

export const viewport: Viewport = {
  themeColor: "#7d40ff"
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
