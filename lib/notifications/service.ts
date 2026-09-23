import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CreateBookingNotificationsParams {
  interviewId: string;
}

export async function createBookingNotifications(params: CreateBookingNotificationsParams) {
  const { interviewId } = params;

  const { data: interview, error: intErr } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', interviewId)
    .single();

  if (intErr || !interview) throw new Error(`Failed to fetch interview: ${intErr?.message}`);

  const { data: panel, error: pnlErr } = await supabase
    .from('interview_panel_members')
    .select('user_id, profiles!inner(email)')
    .eq('interview_id', interviewId);

  if (pnlErr) throw new Error(`Failed to fetch panel members: ${pnlErr.message}`);

  const interviewers = panel.map(p => ({
    userId: p.user_id,
    email: (p.profiles as unknown as { email: string }).email,
  }));

  const userIds = interviewers.map(i => i.userId);
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, email_enabled')
    .in('user_id', userIds);

  const prefsMap = new Map(prefs?.map(p => [p.user_id, p.email_enabled]) || []);

  const notificationsToCreate: Record<string, unknown>[] = [];
  const now = DateTime.utc();
  const startsAt = DateTime.fromISO(interview.starts_at, { zone: 'utc' });

  // 1. Booking confirmations
  notificationsToCreate.push({
    interview_id: interviewId,
    recipient_email: interview.candidate_email,
    type: 'BOOKING_CONFIRMATION_CANDIDATE',
    status: 'PENDING',
    scheduled_for: now.toISO(),
    schedule_version: interview.schedule_version,
  });

  for (const inv of interviewers) {
    if (prefsMap.get(inv.userId) === false) continue;
    notificationsToCreate.push({
      interview_id: interviewId,
      recipient_user_id: inv.userId,
      recipient_email: inv.email,
      type: 'BOOKING_CONFIRMATION_INTERVIEWER',
      status: 'PENDING',
      scheduled_for: now.toISO(),
      schedule_version: interview.schedule_version,
    });
  }

  // 2. Reminders
  const reminders = [
    { type: 'REMINDER_24_HOURS', time: startsAt.minus({ hours: 24 }) },
    { type: 'REMINDER_1_HOUR', time: startsAt.minus({ hours: 1 }) },
    { type: 'REMINDER_10_MINUTES', time: startsAt.minus({ minutes: 10 }) },
  ];

  for (const rem of reminders) {
    if (rem.time > now) {
      notificationsToCreate.push({
        interview_id: interviewId,
        recipient_email: interview.candidate_email,
        type: rem.type,
        status: 'PENDING',
        scheduled_for: rem.time.toISO(),
        schedule_version: interview.schedule_version,
      });

      for (const inv of interviewers) {
        if (prefsMap.get(inv.userId) === false) continue;
        notificationsToCreate.push({
          interview_id: interviewId,
          recipient_user_id: inv.userId,
          recipient_email: inv.email,
          type: rem.type,
          status: 'PENDING',
          scheduled_for: rem.time.toISO(),
          schedule_version: interview.schedule_version,
        });
      }
    }
  }

  const { error } = await supabase.from('notifications').upsert(notificationsToCreate, {
    onConflict: 'interview_id,recipient_email,type',
    ignoreDuplicates: false, 
  });

  if (error) throw new Error(`Failed to insert notifications: ${error.message}`);
  return { success: true };
}

export async function createRescheduleNotifications(params: { interviewId: string; reason?: string }) {
  const { interviewId } = params;

  // Mark all old pending notifications for this interview as cancelled
  await supabase.from('notifications')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('interview_id', interviewId)
    .eq('status', 'PENDING');

  // Then create booking notifications (they will pick up the new schedule_version)
  await createBookingNotifications({ interviewId });
}

export async function createCancellationNotifications(params: { interviewId: string; reason?: string }) {
  const { interviewId } = params;

  // Cancel all pending reminders
  await supabase.from('notifications')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('interview_id', interviewId)
    .eq('status', 'PENDING');

  const { data: interview } = await supabase.from('interviews').select('*').eq('id', interviewId).single();
  if (!interview) return;

  const { data: panel } = await supabase
    .from('interview_panel_members')
    .select('user_id, profiles!inner(email)')
    .eq('interview_id', interviewId);

  const notificationsToCreate: Record<string, unknown>[] = [];
  const now = DateTime.utc().toISO();

  notificationsToCreate.push({
    interview_id: interviewId,
    recipient_email: interview.candidate_email,
    type: 'CANCELLATION_CONFIRMATION_CANDIDATE',
    status: 'PENDING',
    scheduled_for: now,
    schedule_version: interview.schedule_version,
  });

  const interviewers = panel?.map(p => ({
    userId: p.user_id,
    email: (p.profiles as unknown as { email: string }).email,
  })) || [];

  for (const inv of interviewers) {
    notificationsToCreate.push({
      interview_id: interviewId,
      recipient_user_id: inv.userId,
      recipient_email: inv.email,
      type: 'CANCELLATION_CONFIRMATION_INTERVIEWER',
      status: 'PENDING',
      scheduled_for: now,
      schedule_version: interview.schedule_version,
    });
  }

  await supabase.from('notifications').upsert(notificationsToCreate, {
    onConflict: 'interview_id,recipient_email,type',
    ignoreDuplicates: false, 
  });
}

export async function listNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, recipient_email, type, status, scheduled_for, sent_at, attempt_count, last_error, interview_id')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data;
}

export async function retryNotification(id: string) {
  const { data, error } = await supabase.from('notifications').select('*').eq('id', id).single();
  if (error || !data) throw new Error('Notification not found');

  await supabase.from('notifications')
    .update({
      status: 'PENDING',
      scheduled_for: new Date().toISOString(),
      attempt_count: 0,
      last_error: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  return { success: true };
}
