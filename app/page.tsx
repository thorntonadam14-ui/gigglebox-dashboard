"use client";

import { useEffect, useState } from "react";

function Nav() {
  return (
    <header className="gb-nav">
      <div className="gb-container gb-nav-inner">
        <a className="gb-brand" href="/">
          <img className="gb-logo" src="/gigglebox-logo.png" alt="GiggleBox" />
          <span><span className="gb-brand-kicker">Parent Portal</span><span className="gb-brand-title">GiggleBox Dashboard</span></span>
        </a>
        <nav className="gb-nav-links">
          <a className="gb-nav-link" href="/setup">Setup</a>
          <a className="gb-nav-link" href="/children">Children</a>
          <a className="gb-button" href="/setup">Setup</a>
        </nav>
      </div>
    </header>
  );
}

export default function Home() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setStatus(data?.ok ? (data?.ready ? "ready" : "setup") : "error");
      } catch (err) {
        console.error("Status check failed:", err);
        if (!cancelled) setStatus("failed");
      }
    }

    loadStatus();
    return () => { cancelled = true; };
  }, []);

  const statusCopy = status === "ready" ? "Toy connected" : status === "setup" ? "Setup needed" : status === "loading" ? "Checking..." : "Needs attention";

  return (
    <div className="gb-page">
      <Nav />
      <main className="gb-main">
        <div className="gb-container gb-grid">
          <section className="gb-hero">
            <div>
              <div className="gb-eyebrow">Turn screen time into speak time</div>
              <h1 className="gb-title">A friendly home for your GiggleBox toy.</h1>
              <p className="gb-lede">
                Set up a child profile, connect the toy, and open the parent dashboard without the developer-console feel.
                The working toy connection flow stays exactly where it is — now wrapped in a cleaner, parent-ready experience.
              </p>
              <div className="gb-actions">
                <a className="gb-button" href="/setup">Setup</a>
                <a className="gb-button-secondary" href="/setup">Start Setup</a>
                <a className="gb-nav-link" href="/children">View Children</a>
              </div>
            </div>
            <aside className="gb-hero-panel">
              <div className="gb-orb">GB</div>
              <h2>{statusCopy}</h2>
              <p>Status is checked live from the existing API. No pairing, dashboard, or Bluetooth logic has been moved out of place.</p>
              <div className="gb-actions"><span className="gb-pill">Live status: {status}</span></div>
              <a className="gb-small-link" href="/bluetooth">Advanced toy connection</a>
            </aside>
          </section>

          <section className="gb-grid gb-three gb-section">
            <a className="gb-card" href="/setup" style={{ textDecoration: "none" }}>
              <span className="gb-pill">Step 1</span>
              <h2>Set up child</h2>
              <p className="gb-muted">Create the child profile and generate the sync code used by the toy.</p>
            </a>
            <a className="gb-card" href="/setup" style={{ textDecoration: "none" }}>
              <span className="gb-pill">Step 2</span>
              <h2>Sync the toy</h2>
              <p className="gb-muted">Use setup to generate the code and link the toy to the selected child profile.</p>
            </a>
            <a className="gb-card" href="/children" style={{ textDecoration: "none" }}>
              <span className="gb-pill">Step 3</span>
              <h2>See progress</h2>
              <p className="gb-muted">Open child profiles, activity summaries, spoken words, emotions, and saved work.</p>
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
