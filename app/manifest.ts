import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiggleBox Parent Dashboard",
    short_name: "GiggleBox",
    description: "Parent dashboard for GiggleBox child setup, sync, and activity.",
    id: "/",
    start_url: "/children",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7d40ff",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
