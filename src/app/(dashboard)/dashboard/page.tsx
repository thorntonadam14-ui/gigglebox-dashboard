import { DashboardOverview } from "@/components/gigglebox/DashboardOverview";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";
import { getDashboardOverview } from "@/lib/gigglebox/dashboard";
import { listChildrenForParent } from "@/lib/gigglebox/children";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const user = await getCurrentParentUser();
  const { childId } = await searchParams;

  if (!user) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p>Please sign in first.</p>
      </div>
    );
  }

  const children = await listChildrenForParent(user.id, user.email);
  if (!children.length) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p>No children yet.</p>
      </div>
    );
  }

  const selectedChildId = childId ?? children[0].id;
  const overview = await getDashboardOverview(user.id, user.email, selectedChildId);

  return <DashboardOverview data={overview} />;
}
