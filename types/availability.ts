export type AvailabilityRuleRecord = {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
};

export type AvailabilityExceptionRecord = {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reason: string | null;
};

export function mapRule(row: Record<string, unknown>): AvailabilityRuleRecord {
  return { id: String(row.id), userId: String(row.user_id), dayOfWeek: Number(row.day_of_week), startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5), timezone: String(row.timezone), isActive: Boolean(row.is_active) };
}

export function mapException(row: Record<string, unknown>): AvailabilityExceptionRecord {
  return { id: String(row.id), userId: String(row.user_id), date: String(row.date), startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5), isAvailable: Boolean(row.is_available), reason: typeof row.reason === "string" ? row.reason : null };
}
