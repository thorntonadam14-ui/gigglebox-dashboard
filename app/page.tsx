import { redirect } from "next/navigation";

async function getStatus() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/status`, {
    cache: "no-store"
  });

  return response.json();
}

export default async function HomePage() {
  const status = await getStatus();

  if (status.ready) {
    redirect("/dashboard");
  }

  redirect("/setup");
}
