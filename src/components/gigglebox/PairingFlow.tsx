"use client";

import { useEffect, useState } from "react";

export function PairingFlow({ childId }: { childId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    const response = await fetch(`/api/children/${childId}/link-status`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Failed to fetch link status.");
    setStatus(json);
  }

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/children/${childId}/pairing-code`, { method: "POST", cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to generate code.");
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStatus().catch((err) => setError(err.message));
  }, [childId]);

  useEffect(() => {
    if (!status?.activeCode || status.linked) return;
    const timer = setInterval(() => {
      refreshStatus().catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [status?.activeCode, status?.linked]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2>Link toy to {status?.child?.name ?? "child"}</h2>
        <p>Generate a 6-digit code, then enter it in the toy's grown-up corner.</p>
      </div>

      {status?.linked ? (
        <div>
          <p>Toy linked</p>
          <p>Device: {status.device?.device_name || "Unnamed device"}</p>
          <p>Serial: {status.device?.serial_number || "—"}</p>
          <a href={`/dashboard?childId=${childId}`}>Go to Dashboard</a>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {status?.activeCode ? <div style={{ fontSize: 28, fontWeight: 800 }}>{status.activeCode.code}</div> : <p>No active pairing code yet.</p>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={generateCode} disabled={loading}>{loading ? "Generating..." : "Generate Code"}</button>
            <button onClick={() => refreshStatus()}>Refresh</button>
          </div>
          {error ? <div style={{ color: "crimson" }}>{error}</div> : null}
        </div>
      )}
    </div>
  );
}
