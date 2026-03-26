import { NextRequest, NextResponse } from "next/server";
import { createChildForParent, listChildrenForParent } from "@/lib/gigglebox/children";
import { getCurrentParentUser } from "@/lib/gigglebox/auth-adapter";

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentParentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const children = await listChildrenForParent(user.id, user.email);
    return NextResponse.json(children);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentParentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await request.json();
    const child = await createChildForParent(user.id, user.email, body);
    return NextResponse.json(child, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 400 });
  }
}
