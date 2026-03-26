import type { DashboardOverviewResponse } from "@/types/gigglebox";

export function DashboardOverview({ data }: { data: DashboardOverviewResponse }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2>{data.child.name}</h2>
        <p>{typeof data.child.age === "number" ? `Age ${data.child.age}` : "Age not set"}</p>
      </div>

      <div>
        <p>Linked device: {data.device.linked ? "Yes" : "No"}</p>
        <p>Events: {data.summary.eventCount}</p>
        <p>Open alerts: {data.summary.openAlerts}</p>
        <p>Last active: {data.summary.lastActiveAt || "No events yet"}</p>
      </div>

      <div>
        <h3>Recent events</h3>
        {!data.recentEvents.length ? (
          <p>No telemetry yet for this child.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {data.recentEvents.map((event) => (
              <div key={event.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 12 }}>
                <strong>{event.event_type}</strong>
                <div>{event.occurred_at}</div>
                <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>{JSON.stringify(event.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
