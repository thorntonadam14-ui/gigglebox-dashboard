import { NextRequest, NextResponse } from "next/server";
import { generateChildPairingCode } from "@/lib/gigglebox/children";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  try {
    const user = await getCurrentParentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { childId } = await params;
    const code = await generateChildPairingCode(user.id, user.email, childId);

    return NextResponse.json({ code: code.code, expiresAt: code.expires_at });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 400 });
  }
}
