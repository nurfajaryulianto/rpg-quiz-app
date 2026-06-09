import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  // Verify the caller is an authenticated admin
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: caller } = await supabaseAdmin
    .from("participants")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (caller?.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, updates } = body as {
      id: string;
      updates: {
        name?: string;
        nik?: string;
        role?: "participant" | "supervisor" | "admin";
        area?: string | null;
        jabatan?: string | null;
        sub_dept?: string | null;
      };
    };

    if (!id || !updates) {
      return NextResponse.json({ success: false, message: "Missing id or updates" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("participants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
