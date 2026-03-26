import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseAdmin() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      count: data?.length ?? 0,
      children: data ?? []
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const age = typeof body?.age === "number" ? body.age : null;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: parent, error: parentError } = await supabase
      .from("parent_profiles")
      .insert({ email: "local@test.com" })
      .select("id")
      .single();

    if (parentError) {
      throw parentError;
    }

    const { data, error } = await supabase
      .from("children")
      .insert({
        parent_id: parent.id,
        name,
        age
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        child: data
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
