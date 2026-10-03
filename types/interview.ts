export type Interview = {
  id: string;
  schedulingRequestId: string;
  schedulingLinkId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  roundName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  durationMinutes: number;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  interviewers: { id: string; name: string; email: string }[];
  calendarProvider?: string | null;
  googleCalendarId?: string | null;
  googleEventId?: string | null;
  googleMeetUrl?: string | null;
  googleConferenceId?: string | null;
  calendarSyncStatus?: "PENDING" | "SYNCED" | "FAILED";
  calendarSyncError?: string | null;
  calendarSyncedAt?: string | null;
};

export function mapInterview(row: Record<string, unknown>, interviewers: Interview["interviewers"] = []): Interview {
  const startsAt = String(row.starts_at);
  const endsAt = String(row.ends_at);
  return {
    id: String(row.id),
    schedulingRequestId: String(row.scheduling_request_id),
    schedulingLinkId: String(row.scheduling_link_id),
    candidateId: String(row.candidate_id),
    candidateName: String(row.candidate_name),
    candidateEmail: String(row.candidate_email),
    jobId: String(row.job_id),
    jobTitle: String(row.job_title),
    roundName: String(row.round_name),
    startsAt,
    endsAt,
    timezone: String(row.timezone),
    durationMinutes: Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000),
    status: String(row.status) as Interview["status"],
    createdAt: String(row.created_at),
    interviewers,
    calendarProvider: typeof row.calendar_provider === "string" ? row.calendar_provider : null,
    googleCalendarId: typeof row.google_calendar_id === "string" ? row.google_calendar_id : null,
    googleEventId: typeof row.google_event_id === "string" ? row.google_event_id : null,
    googleMeetUrl: typeof row.google_meet_url === "string" ? row.google_meet_url : null,
    googleConferenceId: typeof row.google_conference_id === "string" ? row.google_conference_id : null,
    calendarSyncStatus: String(row.calendar_sync_status ?? "PENDING") as Interview["calendarSyncStatus"],
    calendarSyncError: typeof row.calendar_sync_error === "string" ? row.calendar_sync_error : null,
    calendarSyncedAt: typeof row.calendar_synced_at === "string" ? row.calendar_synced_at : null,
  };
}
