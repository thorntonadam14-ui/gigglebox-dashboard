import { NextRequest, NextResponse } from "next/server";
import { getChildLinkStatus } from "@/lib/gigglebox/children";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  try {
    const user = await getCurrentParentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { childId } = await params;
    const status = await getChildLinkStatus(user.id, user.email, childId);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 400 });
  }
}
