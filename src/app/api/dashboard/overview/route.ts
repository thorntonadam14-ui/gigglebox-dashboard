import { NextRequest, NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/gigglebox/dashboard";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentParentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const childId = request.nextUrl.searchParams.get("childId");
    if (!childId) return NextResponse.json({ error: "Missing childId." }, { status: 400 });

    const data = await getDashboardOverview(user.id, user.email, childId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 400 });
  }
}
