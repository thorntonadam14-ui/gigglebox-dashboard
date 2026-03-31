import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function getStatus() {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const protocol = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  const response = await fetch(`${baseUrl}/api/status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.status}`);
  }

  return response.json();
}

export default async function HomePage() {
  const status = await getStatus();

  if (status.ready) {
    redirect("/dashboard");
  }

  redirect("/setup");
}
