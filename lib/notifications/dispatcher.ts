import { createClient } from '@supabase/supabase-js';
import { SsoMailProvider } from '../integrations/sso-mail';
import { WhatsAppProvider } from '../integrations/messaging/whatsapp';
import { calculateNextRetry } from './retry';
import { 
  buildCandidateBookingTemplate, 
  buildInterviewerBookingTemplate, 
  buildReminderTemplate,
  TemplateData
} from './templates';
import { createManagementToken } from '../booking/action-tokens';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const mailProvider = new SsoMailProvider();
const waProvider = new WhatsAppProvider();

export async function processPendingNotifications(limit = 20) {
  const { data: claims, error: claimErr } = await supabase.rpc('claim_due_notifications', { p_limit: limit });
  if (claimErr) {
    console.error('Error claiming notifications:', claimErr);
    return;
  }

  const notifications = claims || [];
  if (notifications.length === 0) return;

  for (const notif of notifications) {
    try {
      const { data: interview } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', notif.interview_id)
        .single();
        
      if (!interview) {
        throw new Error('Interview not found');
      }

      if (interview.status === 'CANCELLED' && notif.type.startsWith('REMINDER_')) {
        await supabase.from('notifications').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', notif.id);
        continue;
      }

      if (notif.schedule_version !== undefined && interview.schedule_version !== undefined) {
        if (notif.schedule_version < interview.schedule_version && notif.type.startsWith('REMINDER_')) {
          await supabase.from('notifications').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', notif.id);
          continue;
        }
      }

      const templateData: TemplateData = {
        candidateName: interview.candidate_name,
        candidateEmail: interview.candidate_email,
        jobTitle: interview.job_title,
        roundName: interview.round_name,
        startsAt: interview.starts_at,
        endsAt: interview.ends_at,
        timezone: interview.timezone,
        meetUrl: interview.google_meet_url,
      };

      if (notif.recipient_user_id) {
        const { data: pref } = await supabase.from('profiles').select('timezone').eq('id', notif.recipient_user_id).single();
        if (pref?.timezone) templateData.timezone = pref.timezone;
      }

      const isCandidate = (notif.recipient_email === interview.candidate_email || (notif.recipient_phone && notif.recipient_user_id === null));

      if (isCandidate && (notif.type.includes('BOOKING_CONFIRMATION') || notif.type.startsWith('REMINDER_'))) {
        templateData.manageToken = await createManagementToken(interview.id);
      }

      let result;

      if (notif.channel === 'WHATSAPP') {
        const params: Record<string, string> = {
          candidateName: templateData.candidateName,
          job: templateData.jobTitle,
          round: templateData.roundName,
          time: templateData.startsAt,
          timezone: templateData.timezone,
          meetUrl: templateData.meetUrl || "TBD"
        };
        result = await waProvider.send({
          id: notif.id,
          recipientPhone: notif.recipient_phone,
          templateName: notif.type.toLowerCase(),
          parameters: params
        });
      } else {
        let emailContent = { subject: '', htmlBody: '' };
        switch (notif.type) {
          case 'BOOKING_CONFIRMATION_CANDIDATE':
          case 'RESCHEDULE_CONFIRMATION_CANDIDATE':
            emailContent = buildCandidateBookingTemplate(templateData);
            break;
          case 'BOOKING_CONFIRMATION_INTERVIEWER':
          case 'RESCHEDULE_CONFIRMATION_INTERVIEWER':
            emailContent = buildInterviewerBookingTemplate(templateData);
            break;
          case 'CANCELLATION_CONFIRMATION_CANDIDATE':
            emailContent = {
              subject: `Interview Cancelled — ${templateData.jobTitle}`,
              htmlBody: `<h2>Interview Cancelled</h2><p>Hi ${templateData.candidateName},</p><p>Your interview for ${templateData.jobTitle} has been cancelled.</p>`
            };
            break;
          case 'CANCELLATION_CONFIRMATION_INTERVIEWER':
            emailContent = {
              subject: `Interview Cancelled — ${templateData.candidateName}`,
              htmlBody: `<h2>Interview Cancelled</h2><p>The interview with ${templateData.candidateName} for ${templateData.jobTitle} has been cancelled.</p>`
            };
            break;
          case 'REMINDER_24_HOURS':
          case 'REMINDER_1_HOUR':
          case 'REMINDER_10_MINUTES':
            emailContent = buildReminderTemplate(templateData, isCandidate, notif.type as "REMINDER_24_HOURS" | "REMINDER_1_HOUR" | "REMINDER_10_MINUTES");
            break;
          default:
            throw new Error(`Unsupported notification type: ${notif.type}`);
        }

        result = await mailProvider.send({
          id: notif.id,
          recipientEmail: notif.recipient_email,
          subject: emailContent.subject,
          htmlBody: emailContent.htmlBody,
        });
      }

      if (result.success) {
        await supabase.from('notifications').update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          provider: notif.channel === 'WHATSAPP' ? 'WHATSAPP_API' : 'SSO_MAIL',
          provider_message_id: result.providerMessageId,
          last_error: null,
          updated_at: new Date().toISOString()
        }).eq('id', notif.id);
      } else {
        throw new Error(result.error || 'Unknown provider error');
      }

    } catch (err: unknown) {
      const nextRetry = calculateNextRetry(notif.attempt_count);
      if (nextRetry) {
        await supabase.from('notifications').update({
          status: 'PENDING',
          scheduled_for: nextRetry.toISOString(),
          last_error: (err instanceof Error ? err.message : String(err)),
          updated_at: new Date().toISOString()
        }).eq('id', notif.id);
      } else {
        await supabase.from('notifications').update({
          status: 'FAILED',
          last_error: (err instanceof Error ? err.message : String(err)),
          updated_at: new Date().toISOString()
        }).eq('id', notif.id);
      }
    }
  }
}
