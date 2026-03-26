import { PairingFlow } from "@/components/gigglebox/PairingFlow";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export default async function LinkChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const user = await getCurrentParentUser();
  const { childId } = await params;

  if (!user) {
    return (
      <div>
        <h1>Link Toy</h1>
        <p>Please sign in first.</p>
      </div>
    );
  }

  return <PairingFlow childId={childId} />;
}
