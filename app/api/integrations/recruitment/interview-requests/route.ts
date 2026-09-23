import { NextResponse } from "next/server";
import { createInterviewRequest, isValidIntegrationSecret, validateInterviewRequest } from "@/lib/integrations/recruitment";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const secret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!isValidIntegrationSecret(secret)) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Integration authentication required." } }, { status: 401 });
    }

    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "A valid Idempotency-Key header is required." } }, { status: 400 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON." } }, { status: 400 });
    }
    if (!validateInterviewRequest(body)) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid interview scheduling request." } }, { status: 400 });
    }

    const result = await createInterviewRequest(body, idempotencyKey, "recruitment-portal");
    return NextResponse.json({ success: true, data: { id: result.request.id, applicationId: result.request.applicationId, status: result.request.status } }, { status: result.created ? 201 : 200 });
  } catch {
    return NextResponse.json({ success: false, error: { code: "INTEGRATION_ERROR", message: "Unable to create interview scheduling request." } }, { status: 500 });
  }
}