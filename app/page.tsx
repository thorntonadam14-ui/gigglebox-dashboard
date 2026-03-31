export default async function Home() {
  let status = "unknown";

  try {
    const res = await fetch("/api/status", {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      status = data.status || "ok";
    } else {
      status = "error";
    }
  } catch (err) {
    console.error("Status check failed:", err);
    status = "failed";
  }

  return (
    <div>
      <h1>Gigglebox Dashboard</h1>
      <p>Status: {status}</p>
    </div>
  );
}