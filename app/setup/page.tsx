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
    <div className="gb-page">
      <header className="gb-nav">
        <div className="gb-container gb-nav-inner">
          <a className="gb-brand" href="/">
            <img className="gb-logo" src="/gigglebox-logo.png" alt="GiggleBox" />
            <span><span className="gb-brand-kicker">Fast Setup Flow</span><span className="gb-brand-title">Parent + Child Setup</span></span>
          </a>
          <nav className="gb-nav-links">
            <a className="gb-nav-link" href="/">Home</a>
            <a className="gb-nav-link" href="/children">Children</a>
            <a className="gb-button" href="/setup">Setup</a>
          </nav>
        </div>
      </header>

      <main className="gb-main">
        <div className="gb-container gb-grid">
          <section className="gb-hero">
            <div>
              <div className="gb-eyebrow">Set up in minutes</div>
              <h1 className="gb-title-sm">Create a child profile, then sync the toy.</h1>
              <p className="gb-lede">
                Generate the 6-digit code here and enter it on the toy. This keeps the original setup flow intact, but presents it as a clear parent journey.
              </p>
            </div>
            <aside className="gb-hero-panel">
              <div className="gb-orb">1</div>
              <h2>Setup path</h2>
              <p>Create child → generate sync code → enter code on toy → open dashboard.</p>
            </aside>
          </section>

          {error ? <div className="gb-alert">{error}</div> : null}

          <section className="gb-grid gb-two">
            <div className="gb-card">
              <span className="gb-pill">Step 1</span>
              <h2>Create Child Profile</h2>
              <form onSubmit={createChild} className="gb-grid">
                <label className="gb-label">Parent name <input className="gb-input" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Adam" /></label>
                <label className="gb-label">Parent email <input className="gb-input" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" /></label>
                <label className="gb-label">Child name <input className="gb-input" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Georgie" required /></label>
                <label className="gb-label">Child age <input className="gb-input" value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="6" /></label>
                <button className="gb-button" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Child"}</button>
              </form>
            </div>

            <div className="gb-card">
              <span className="gb-pill">Step 2</span>
              <h2>Sync Code</h2>
              {selectedChild ? (
                <div className="gb-grid">
                  <p><strong>Selected child:</strong> {selectedChild.name}{typeof selectedChild.age === "number" ? ` (age ${selectedChild.age})` : ""}</p>
                  <button className="gb-button" onClick={() => generateCode(selectedChild.id)}>Generate Sync Code</button>
                  {pairingCode ? (
                    <div className="gb-grid">
                      <div className="gb-code">{pairingCode.code}</div>
                      <p className="gb-muted">Expires: {pairingCode.expires_at}</p>
                      <div className="gb-alert gb-success"><strong>Next:</strong> Enter this code on the toy. After the toy links successfully, return to the dashboard.</div>
                    </div>
                  ) : <p className="gb-muted">No sync code generated yet.</p>}
                </div>
              ) : <p className="gb-muted">Create or select a child first.</p>}
            </div>
          </section>

          <section className="gb-card">
            <span className="gb-pill">Step 3</span>
            <h2>What the parent does on the toy</h2>
            <ol>
              <li>Open the toy’s grown-up corner.</li>
              <li>Choose <strong>Sync with Parent Dashboard</strong>.</li>
              <li>Enter the 6-digit sync code shown here.</li>
              <li>Wait for the success message on the toy.</li>
              <li>Return to this website.</li>
            </ol>
          </section>

          <section className="gb-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div><span className="gb-pill">Profiles</span><h2>Existing Children</h2></div>
              <button className="gb-button-secondary" onClick={loadChildren}>Refresh</button>
            </div>
            {loadingChildren ? <p>Loading children…</p> : childrenData && childrenData.children.length > 0 ? (
              <div className="gb-grid gb-auto">
                {childrenData.children.map((child) => (
                  <div key={child.id} className="gb-card" style={{ boxShadow: "none", borderColor: child.id === pairingChildId ? "#7d40ff" : undefined }}>
                    <div className="gb-pill">Child</div>
                    <h3>{child.name}</h3>
                    <p className="gb-muted">{typeof child.age === "number" ? `Age ${child.age}` : "Age not set"}</p>
                    <p className="gb-muted" style={{ fontSize: 13, wordBreak: "break-all" }}>{child.id}</p>
                    <button className="gb-button-secondary" onClick={() => setPairingChildId(child.id)}>Use for Sync</button>
                  </div>
                ))}
              </div>
            ) : <p className="gb-muted">No children found yet.</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
