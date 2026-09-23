export const REQUEST_STATUSES = [
  "PENDING",
  "OPEN",
  "SCHEDULED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const VALID_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export type InterviewRequestInput = {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  roundName: string;
  durationMinutes: number;
  panelId?: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
};

export type InterviewRequest = InterviewRequestInput & {
  id: string;
  externalRequestId: string;
  status: RequestStatus;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toInterviewRequest(row: Record<string, unknown>): InterviewRequest {
  return {
    id: String(row.id),
    externalRequestId: String(row.external_request_id),
    applicationId: String(row.application_id),
    candidateId: String(row.candidate_id),
    candidateName: String(row.candidate_name),
    candidateEmail: String(row.candidate_email),
    jobId: String(row.job_id),
    jobTitle: String(row.job_title),
    roundName: String(row.round_name),
    durationMinutes: Number(row.duration_minutes),
    panelId: typeof row.panel_id === "string" ? row.panel_id : null,
    availableFrom: typeof row.available_from === "string" ? row.available_from : null,
    availableUntil: typeof row.available_until === "string" ? row.available_until : null,
    status: String(row.status) as RequestStatus,
    requestedBy: typeof row.requested_by === "string" ? row.requested_by : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
