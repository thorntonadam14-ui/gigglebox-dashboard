"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setStatus(data?.ok ? "ok" : "error");
        }
      } catch (err) {
        console.error("Status check failed:", err);
        if (!cancelled) {
          setStatus("failed");
        }
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Gigglebox Dashboard</h1>
      <p>Status: {status}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/setup">Setup</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/bluetooth">Bluetooth Console</a>
      </div>
    </div>
  );
}
