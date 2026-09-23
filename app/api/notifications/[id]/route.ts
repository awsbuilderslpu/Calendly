import { NextRequest, NextResponse } from "next/server";
import { getRecruiterOrAdmin } from "@/lib/auth/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getRecruiterOrAdmin();
  if (access.status !== 200) return NextResponse.json({ error: "Recruiter or admin access required." }, { status: access.status });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const p = await params;
  const { data, error } = await supabase
    .from('notifications')
    .select('id, recipient_email, type, status, scheduled_for, sent_at, attempt_count, last_error')
    .eq('id', p.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
