import { signIn, signUp } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ status?: string; next?: string }>;
}) {
  const query = await searchParams;
  const messages: Record<string, string> = {
    failed: "Unable to sign in. Check your details and confirm your email before trying again.",
    confirm: "If registration is available for this address, check your email to confirm it, then return here to sign in. Report access still requires administrator verification.",
    "signup-failed": "Unable to register. Check your details or contact your administrator."
  };
  return <main className="gb-main"><div className="gb-container">
    <section className="gb-card" style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>Parent sign in</h1>
      <p>Sign in to view reports for children linked to your verified parent account.</p>
      {query.status && messages[query.status] ? <p role="status">{messages[query.status]}</p> : null}
      <form action={signIn}>
        <input type="hidden" name="next" value={query.next ?? "/children"} />
        <label style={{ display: "block", margin: "16px 0" }}>Email
          <input style={{ display: "block", width: "100%" }} type="email" name="email" autoComplete="username" required />
        </label>
        <label style={{ display: "block", margin: "16px 0" }}>Password
          <input style={{ display: "block", width: "100%" }} type="password" name="password" autoComplete="current-password" required />
        </label>
        <button className="gb-button" type="submit">Sign in</button>
      </form>
      <details style={{ marginTop: 24 }}><summary>Need a parent login?</summary>
        <p>Choose your own password and confirm your email. Registration does not grant access to any child; an administrator must separately verify and link your account.</p>
        <form action={signUp}>
          <label style={{ display: "block", margin: "16px 0" }}>Email
            <input style={{ display: "block", width: "100%" }} type="email" name="email" autoComplete="email" required />
          </label>
          <label style={{ display: "block", margin: "16px 0" }}>New password
            <input style={{ display: "block", width: "100%" }} type="password" name="password" autoComplete="new-password" required />
          </label>
          <button className="gb-button-secondary" type="submit">Register and verify email</button>
        </form>
      </details>
      <p><a href="/">Home</a></p>
    </section>
  </div></main>;
}
