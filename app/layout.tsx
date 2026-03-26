import type { Metadata, Viewport } from "next";
import PwaRegistrar from "@/components/PwaRegistrar";

export const metadata: Metadata = {
  title: "GiggleBox Dashboard",
  description: "Parent dashboard for GiggleBox child setup, sync, and activity.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GiggleBox"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    apple: "/icons/icon-192.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  }
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
      <body>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
