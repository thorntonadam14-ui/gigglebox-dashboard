import { ChildForm } from "@/components/gigglebox/ChildForm";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export default async function NewChildPage() {
  const user = await getCurrentParentUser();

  if (!user) {
    return (
      <div>
        <h1>Add Child</h1>
        <p>Please sign in first.</p>
      </div>
    );
  }

  return <ChildForm />;
}
