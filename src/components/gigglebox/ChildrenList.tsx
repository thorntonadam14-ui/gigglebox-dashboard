export function ChildrenList({ children }: { children: any[] }) {
  if (!children.length) {
    return (
      <div>
        <h2>No children yet</h2>
        <p>Create a child profile, then link a toy to start seeing data.</p>
        <a href="/children/new">Add Child</a>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {children.map((child) => {
        const activeLink = child.child_device_links?.find((x: any) => x.is_active);
        const linked = Boolean(activeLink);

        return (
          <div key={child.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
            <h3>{child.name}</h3>
            <p>
              {child.nickname ? `Nickname: ${child.nickname}` : "No nickname"}
              {typeof child.age === "number" ? ` • Age ${child.age}` : ""}
            </p>
            <p>{linked ? "Toy linked" : "Not linked"}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href={`/children/${child.id}/link`}>{linked ? "Manage Link" : "Link Toy"}</a>
              <a href={`/dashboard?childId=${child.id}`}>Open Dashboard</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
