import { ChildrenList } from "@/components/gigglebox/ChildrenList";
import { listChildrenForParent } from "@/lib/gigglebox/children";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export default async function ChildrenPage() {
  const user = await getCurrentParentUser();

  if (!user) {
    return (
      <div>
        <h1>Children</h1>
        <p>Please sign in first.</p>
      </div>
    );
  }

  const children = await listChildrenForParent(user.id, user.email);
  return <ChildrenList children={children as any[]} />;
}
