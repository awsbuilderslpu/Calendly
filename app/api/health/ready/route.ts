import { NextResponse } from "next/server";
import { createDatabaseAdmin } from "@/lib/db/admin";

export async function GET() {
  try {
    const database = createDatabaseAdmin();
    // Test database connection
    const { error } = await database.from("profiles").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json({ status: "READY", database: "healthy" });
  } catch (err: unknown) {
    return NextResponse.json({ status: "NOT_READY", error: "Database connection failed" }, { status: 503 });
  }
}
