"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChildForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", nickname: "", age: "", avatarKey: "monster-purple" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        nickname: form.nickname || null,
        age: form.age ? Number(form.age) : null,
        avatarKey: form.avatarKey || null
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setError(json.error || "Failed to create child.");
      setLoading(false);
      return;
    }

    router.push(`/children/${json.id}/link`);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <label>
        Child name
        <input required value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
      </label>
      <label>
        Nickname
        <input value={form.nickname} onChange={(e) => setForm((s) => ({ ...s, nickname: e.target.value }))} />
      </label>
      <label>
        Age
        <input type="number" min="1" max="18" value={form.age} onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))} />
      </label>
      <label>
        Avatar
        <select value={form.avatarKey} onChange={(e) => setForm((s) => ({ ...s, avatarKey: e.target.value }))}>
          <option value="monster-purple">Monster Purple</option>
          <option value="rocket-blue">Rocket Blue</option>
          <option value="star-yellow">Star Yellow</option>
        </select>
      </label>
      {error ? <div style={{ color: "crimson" }}>{error}</div> : null}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Child"}</button>
        <a href="/children">Cancel</a>
      </div>
    </form>
  );
}
