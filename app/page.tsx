export default async function Home() {
  const res = await fetch("http://localhost:3000/api/status", { cache: "no-store" });
  const data = await res.json();

  if (!data.ready) {
    return (
      <script dangerouslySetInnerHTML={{ __html: 'window.location.href="/setup"' }} />
    );
  }

  return (
    <script dangerouslySetInnerHTML={{ __html: 'window.location.href="/dashboard"' }} />
  );
}
