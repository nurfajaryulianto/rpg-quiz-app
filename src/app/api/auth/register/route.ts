import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const NIK_EMAIL_DOMAIN = "ksm.local";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    // Support single or bulk
    const participants: { name: string; nik: string; role?: string; area?: string | null }[] = Array.isArray(body.participants)
      ? body.participants
      : [{ name: body.name, nik: body.nik, role: body.role, area: body.area }];

    const results: { name: string; nik: string; success: boolean; error?: string }[] = [];

    for (const p of participants) {
      if (!p.name || !p.nik) {
        results.push({ name: p.name, nik: p.nik, success: false, error: "Name and NIK are required" });
        continue;
      }

      const email = `${p.nik}@${NIK_EMAIL_DOMAIN}`;

      // Check if participant with this NIK already exists
      const { data: existing } = await supabaseAdmin
        .from("participants")
        .select("id")
        .eq("nik", p.nik)
        .maybeSingle();

      if (existing) {
        // Update name if participant already exists
        await supabaseAdmin
          .from("participants")
          .update({ name: p.name })
          .eq("id", existing.id);
        results.push({ name: p.name, nik: p.nik, success: true });
        continue;
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: "user123",
        email_confirm: true,
      });

      if (authError) {
        // If user already exists in auth, try to find and link
        if (authError.message?.includes("already been registered")) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users?.find((u) => u.email === email);
          if (existingUser) {
            const { error: partError } = await supabaseAdmin
              .from("participants")
              .insert({
                user_id: existingUser.id,
                name: p.name,
                email,
                nik: p.nik,
                role: (p.role as "participant" | "supervisor" | "admin") ?? "participant",
                area: p.area ?? null,
              });
            if (partError) {
              results.push({ name: p.name, nik: p.nik, success: false, error: partError.message });
            } else {
              results.push({ name: p.name, nik: p.nik, success: true });
            }
            continue;
          }
        }
        results.push({ name: p.name, nik: p.nik, success: false, error: authError.message });
        continue;
      }

      // Create participant record
      const { error: partError } = await supabaseAdmin
        .from("participants")
        .insert({
          user_id: authData.user.id,
          name: p.name,
          email,
          nik: p.nik,
          role: (p.role as "participant" | "supervisor" | "admin") ?? "participant",
          area: p.area ?? null,
        });

      if (partError) {
        // Cleanup auth user if participant creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        results.push({ name: p.name, nik: p.nik, success: false, error: partError.message });
      } else {
        results.push({ name: p.name, nik: p.nik, success: true });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} created, ${failCount} failed`,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
