"use client";

import { useEffect, useState } from "react";

type Child = {
  id: string;
  name: string;
  age: number | null;
  created_at?: string | null;
};

type ChildrenResponse = {
  ok: boolean;
  count: number;
  children: Child[];
  error?: string;
};

type PairingCode = {
  id: string;
  code: string;
  child_id: string;
  expires_at: string;
  used: boolean;
};

const shell: React.CSSProperties = {
  padding: 32,
  maxWidth: 1200,
  margin: "0 auto",
  display: "grid",
  gap: 20,
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 20,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
};

export default function SetupPage() {
  const [childrenData, setChildrenData] = useState<ChildrenResponse | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pairingChildId, setPairingChildId] = useState<string>("");
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");

  async function loadChildren() {
    setLoadingChildren(true);
    setError(null);
    try {
      const response = await fetch("/api/children", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load children.");
      }
      setChildrenData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingChildren(false);
    }
  }

  async function createChild(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setPairingCode(null);

    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName: parentName || null,
          parentEmail: parentEmail || null,
          name: childName,
          age: childAge ? Number(childAge) : null
        })
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to create child.");
      }

      setChildName("");
      setChildAge("");
      await loadChildren();
      setPairingChildId(json.child.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function generateCode(childId: string) {
    setError(null);
    setPairingCode(null);
    try {
      const response = await fetch("/api/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId })
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to generate sync code.");
      }
      setPairingChildId(childId);
      setPairingCode(json.pairingCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    loadChildren();
  }, []);

  const selectedChild = childrenData?.children.find((child) => child.id === pairingChildId) ?? null;

  return (
    <div style={shell}>
      <div>
        <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 8 }}>Fast Setup Flow</div>
        <h1 style={{ margin: 0, fontSize: 40 }}>Parent + Child Setup</h1>
        <p style={{ marginTop: 10, color: "#667085", maxWidth: 760 }}>
          This is the fastest flow to get the website and toy talking to each other. Create a child, generate a sync code, then enter that code on the toy.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "underline" }}>Home</a>
          <a href="/children" style={{ textDecoration: "underline" }}>Children</a>
          <a href="/dashboard" style={{ textDecoration: "underline" }}>Dashboard</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>1. Create Child Profile</h2>
          <p style={{ color: "#667085" }}>
            Keep this minimal for now. Enough to create the child and move quickly to syncing the toy.
          </p>

          <form onSubmit={createChild} style={{ display: "grid", gap: 12 }}>
            <label>
              <div style={{ marginBottom: 6 }}>Parent name (optional)</div>
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd" }}
                placeholder="Adam"
              />
            </label>

            <label>
              <div style={{ marginBottom: 6 }}>Parent email (optional)</div>
              <input
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd" }}
                placeholder="parent@example.com"
              />
            </label>

            <label>
              <div style={{ marginBottom: 6 }}>Child name</div>
              <input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd" }}
                placeholder="Georgie"
                required
              />
            </label>

            <label>
              <div style={{ marginBottom: 6 }}>Child age (optional)</div>
              <input
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd" }}
                placeholder="6"
              />
            </label>

            <button
              type="submit"
              disabled={creating}
              style={{ padding: "12px 16px", borderRadius: 10 }}
            >
              {creating ? "Creating…" : "Create Child"}
            </button>
          </form>
        </div>

        <div style={card}>
          <h2 style={{ marginTop: 0 }}>2. Sync Code</h2>
          <p style={{ color: "#667085" }}>
            Generate a sync code, then go to the toy’s grown-up corner and enter it there.
          </p>

          {selectedChild ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <strong>Selected child:</strong> {selectedChild.name}
                {typeof selectedChild.age === "number" ? ` (age ${selectedChild.age})` : ""}
              </div>

              <button
                onClick={() => generateCode(selectedChild.id)}
                style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16 }}
              >
                Generate Sync Code
              </button>

              {pairingCode ? (
                <div
                  style={{
                    border: "1px dashed #7c3aed",
                    borderRadius: 16,
                    padding: 18,
                    background: "#faf5ff"
                  }}
                >
                  <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 8 }}>Sync Code</div>
                  <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 4 }}>{pairingCode.code}</div>
                  <div style={{ marginTop: 10, color: "#667085", fontSize: 14 }}>
                    Expires: {pairingCode.expires_at}
                  </div>
                </div>
              ) : (
                <p style={{ color: "#667085" }}>No sync code generated yet.</p>
              )}
            </>
          ) : (
            <p style={{ color: "#667085" }}>Create or select a child first.</p>
          )}
        </div>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>3. What the parent does on the toy</h2>
        <ol style={{ marginTop: 0, paddingLeft: 18 }}>
          <li>Open the toy’s grown-up corner.</li>
          <li>Choose <strong>Sync with Parent Dashboard</strong>.</li>
          <li>Enter the 6-digit sync code shown here.</li>
          <li>Wait for the success message on the toy.</li>
        </ol>
        <p style={{ color: "#667085", marginBottom: 0 }}>
          Once the toy syncs, the device will link to this child and telemetry can start flowing into the dashboard.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Existing Children</h2>
        {loadingChildren ? (
          <p>Loading children…</p>
        ) : childrenData && childrenData.children.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {childrenData.children.map((child) => (
              <div
                key={child.id}
                style={{
                  border: child.id === pairingChildId ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 14
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 18 }}>{child.name}</div>
                <div style={{ color: "#667085", marginTop: 4 }}>
                  {typeof child.age === "number" ? `Age ${child.age}` : "Age not set"}
                </div>
                <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>
                  {child.id}
                </div>
                <button
                  onClick={() => setPairingChildId(child.id)}
                  style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10 }}
                >
                  Use for Sync
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No children yet.</p>
        )}
      </div>

      {error ? (
        <div style={{ ...card, borderColor: "#fda29b", background: "#fff5f4", color: "#b42318" }}>
          <strong>Setup error:</strong> {error}
        </div>
      ) : null}
    </div>
  );
}
