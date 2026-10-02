import { DateTime } from 'luxon';

function escapeHtml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoString: string, timezone: string): string {
  const dt = DateTime.fromISO(isoString).setZone(timezone);
  return dt.toFormat('cccc, LLLL d, yyyy');
}

function formatTimeRange(startIso: string, endIso: string, timezone: string): string {
  const start = DateTime.fromISO(startIso).setZone(timezone);
  const end = DateTime.fromISO(endIso).setZone(timezone);
  return `${start.toFormat('h:mm a')} \u2013 ${end.toFormat('h:mm a')} ${start.toFormat('ZZZZZ')}`;
}

export interface TemplateData {
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  roundName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  meetUrl?: string | null;
  durationMins?: number;
  manageToken?: string;
}

export function buildCandidateBookingTemplate(data: TemplateData) {
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);
  const meetStr = data.meetUrl ? data.meetUrl : "Meeting details will be shared shortly.";
  const manageLink = data.manageToken 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage-interview/${data.manageToken}`
    : '';

  const content = `Your interview has been successfully scheduled.

Role: ${data.jobTitle}
Round: ${data.roundName}
Date: ${dateStr}
Time: ${timeStr}

Google Meet:
${meetStr}

${manageLink ? `Manage your interview:\n${manageLink}` : ''}`;

  return {
    subject: `Interview Scheduled \u2014 ${data.jobTitle}`,
    greeting: `Hi ${data.candidateName},`,
    heading: `Interview Scheduled \u2014 ${data.jobTitle}`,
    content,
    senderName: "AWS Student Builder Group",
    senderRole: "Recruitment Team",
    htmlBody: content.replace(/\n/g, "<br>") // fallback if needed
  };
}

export function buildInterviewerBookingTemplate(data: TemplateData) {
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);
  const meetStr = data.meetUrl ? data.meetUrl : "Meeting details will be shared shortly.";

  const content = `You have been scheduled for an interview.

Candidate: ${data.candidateName} ${data.candidateEmail ? `(${data.candidateEmail})` : ''}
Role: ${data.jobTitle}
Round: ${data.roundName}
Date: ${dateStr}
Time: ${timeStr}

Google Meet:
${meetStr}`;

  return {
    subject: `Interview Scheduled \u2014 ${data.candidateName}`,
    greeting: "Hi Interviewer,",
    heading: `Interview Scheduled \u2014 ${data.candidateName}`,
    content,
    senderName: "AWS Student Builder Group",
    senderRole: "Recruitment Team",
    htmlBody: content.replace(/\n/g, "<br>")
  };
}

export function buildReminderTemplate(
  data: TemplateData,
  isCandidate: boolean,
  type: 'REMINDER_24_HOURS' | 'REMINDER_1_HOUR' | 'REMINDER_30_MINUTES' | 'REMINDER_10_MINUTES'
) {
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);
  const meetStr = data.meetUrl ? data.meetUrl : "Meeting details will be shared shortly.";
  const manageLink = (isCandidate && data.manageToken) 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage-interview/${data.manageToken}`
    : '';

  let candidateSubject = '';
  let interviewerSubject = '';

  if (type === 'REMINDER_24_HOURS') {
    candidateSubject = `Interview Reminder \u2014 Tomorrow`;
    interviewerSubject = `Upcoming Interview \u2014 Tomorrow`;
  } else if (type === 'REMINDER_1_HOUR') {
    candidateSubject = `Interview Reminder \u2014 In 1 Hour`;
    interviewerSubject = `Upcoming Interview \u2014 In 1 Hour`;
  } else if (type === 'REMINDER_30_MINUTES') {
    candidateSubject = `Interview Reminder \u2014 In 30 Minutes`;
    interviewerSubject = `Upcoming Interview \u2014 In 30 Minutes`;
  } else {
    candidateSubject = `Interview Starting Soon \u2014 10 Minutes`;
    interviewerSubject = `Interview Starting Soon \u2014 10 Minutes`;
  }

  const subject = isCandidate ? candidateSubject : interviewerSubject;
  
  const content = isCandidate
    ? `This is a reminder for your upcoming interview.

Role: ${data.jobTitle}
Round: ${data.roundName}
Date: ${dateStr}
Time: ${timeStr}

Google Meet:
${meetStr}

${manageLink ? `Manage your interview:\n${manageLink}` : ''}`
    : `This is a reminder for your upcoming interview.

Candidate: ${data.candidateName} ${data.candidateEmail ? `(${data.candidateEmail})` : ''}
Role: ${data.jobTitle}
Round: ${data.roundName}
Date: ${dateStr}
Time: ${timeStr}

Google Meet:
${meetStr}`;

  return { 
    subject, 
    greeting: isCandidate ? `Hi ${data.candidateName},` : "Hi Interviewer,",
    heading: subject,
    content,
    senderName: "AWS Student Builder Group",
    senderRole: "Recruitment Team",
    htmlBody: content.replace(/\n/g, "<br>") 
  };
}
