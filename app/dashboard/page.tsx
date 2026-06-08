export default function Dashboard() {
  return (
    <div className="gb-page">
      <header className="gb-nav">
        <div className="gb-container gb-nav-inner">
          <a className="gb-brand" href="/">
            <img className="gb-logo" src="/gigglebox-logo.png" alt="GiggleBox" />
            <span><span className="gb-brand-kicker">Connected Area</span><span className="gb-brand-title">GiggleBox Dashboard</span></span>
          </a>
          <nav className="gb-nav-links">
            <a className="gb-nav-link" href="/">Home</a>
            <a className="gb-nav-link" href="/children">Children</a>
            <a className="gb-button" href="/setup">Setup</a>
          </nav>
          <a className="gb-studio-mark" href="/" aria-label="Giggle Byte Studios">
            <img src="/gigglebyte-studios-logo.png" alt="Giggle Byte Studios" />
          </a>
        </div>
      </header>
      <main className="gb-main">
        <div className="gb-container gb-grid">
          <section className="gb-hero">
            <div>
              <div className="gb-eyebrow">Device connected</div>
              <h1 className="gb-title-sm">Your GiggleBox is ready.</h1>
              <p className="gb-lede">
                This is the post-sync area. Use it as the parent-friendly landing point once the toy has connected successfully.
              </p>
              <div className="gb-actions">
                <a className="gb-button" href="/children">Open Children</a>
                <a className="gb-button-secondary" href="/bluetooth">Bluetooth Console</a>
              </div>
            </div>
            <aside className="gb-hero-panel">
              <div className="gb-orb">✓</div>
              <h2>Device connected</h2>
              <p>Do not return to setup unless you intentionally want to create a new child or start a fresh sync flow.</p>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
