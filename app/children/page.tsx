"use client";

import { useEffect, useState } from "react";

type Child = { id: string; name: string; age: number | null; created_at?: string | null; };
type ChildrenResponse = { ok: boolean; count: number; children: Child[]; error?: string; };

export default function ChildrenPage() {
  const [data, setData] = useState<ChildrenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadChildren() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/children", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to load children.");
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadChildren(); }, []);

  return (
    <div className="gb-page">
      <header className="gb-nav">
        <div className="gb-container gb-nav-inner">
          <a className="gb-brand" href="/">
            <img className="gb-logo" src="/gigglebox-logo.png" alt="GiggleBox" />
            <span><span className="gb-brand-kicker">Parent Dashboard</span><span className="gb-brand-title">Children</span></span>
          </a>
          <nav className="gb-nav-links">
            <a className="gb-nav-link" href="/">Home</a>
            <a className="gb-nav-link" href="/setup">Setup</a>
            <a className="gb-button" href="/bluetooth">Talk to Toy</a>
          </nav>
        </div>
      </header>
      <main className="gb-main">
        <div className="gb-container gb-grid">
          <section className="gb-hero">
            <div>
              <div className="gb-eyebrow">Children and progress</div>
              <h1 className="gb-title-sm">Every child profile in one friendly view.</h1>
              <p className="gb-lede">Profiles are still pulled from Supabase exactly as before. This page now feels like a parent product experience instead of a raw admin screen.</p>
              <div className="gb-actions"><button className="gb-button-secondary" onClick={loadChildren}>Refresh Children</button><a className="gb-button" href="/setup">Add or Sync Child</a></div>
            </div>
            <aside className="gb-hero-panel"><div className="gb-orb">{data?.count ?? "?"}</div><h2>Total children</h2><p>Open a child card to view device status, activity, words, emotions, and saved creative work.</p></aside>
          </section>

          {loading ? <div className="gb-card">Loading children…</div> : null}
          {error ? <div className="gb-alert">{error}</div> : null}

          {data && !loading ? data.children.length === 0 ? (
            <div className="gb-card"><span className="gb-pill">No profiles yet</span><h2>Create your first child profile</h2><p className="gb-muted">Use setup to create a child and generate the toy sync code.</p><a className="gb-button" href="/setup">Start Setup</a></div>
          ) : (
            <>
              <section className="gb-grid gb-auto">
                {data.children.map((child) => (
                  <a key={child.id} href={`/children/${child.id}`} className="gb-card" style={{ color: "inherit", textDecoration: "none" }}>
                    <span className="gb-pill">Child Profile</span>
                    <h2>{child.name}</h2>
                    <p className="gb-muted">{typeof child.age === "number" ? `Age ${child.age}` : "Age not set"}</p>
                    <p className="gb-muted" style={{ fontSize: 13, wordBreak: "break-all" }}>ID: {child.id}</p>
                    <p className="gb-muted" style={{ fontSize: 13 }}>Created: {child.created_at ?? "—"}</p>
                    <span className="gb-button-secondary">Open Profile</span>
                  </a>
                ))}
              </section>
              <section className="gb-card"><span className="gb-pill">Quick View</span><h2>Total children</h2><div className="gb-stat">{data.count}</div></section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
