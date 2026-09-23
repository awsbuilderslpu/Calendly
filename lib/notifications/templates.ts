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
  const safeName = escapeHtml(data.candidateName);
  const safeJob = escapeHtml(data.jobTitle);
  const safeRound = escapeHtml(data.roundName);
  const safeMeet = data.meetUrl ? escapeHtml(data.meetUrl) : null;
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);
  
  const meetHtml = safeMeet 
    ? `<p><strong>Google Meet:</strong> <a href="${safeMeet}">${safeMeet}</a></p>`
    : `<p>Meeting details will be available shortly.</p>`;

  const manageHtml = data.manageToken 
    ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage-interview/${data.manageToken}">Manage your interview</a></p>`
    : '';

  const html = `
    <h2>Interview Scheduled — ${safeJob}</h2>
    <p>Hi ${safeName},</p>
    <p>Your interview has been successfully scheduled.</p>
    <ul>
      <li><strong>Role:</strong> ${safeJob}</li>
      <li><strong>Round:</strong> ${safeRound}</li>
      <li><strong>Date:</strong> ${dateStr}</li>
      <li><strong>Time:</strong> ${timeStr}</li>
    </ul>
    ${meetHtml}
    ${manageHtml}
    <p>Best regards,<br>Recruitment Team</p>
  `;

  return {
    subject: `Interview Scheduled \u2014 ${data.jobTitle}`,
    htmlBody: html,
  };
}

export function buildInterviewerBookingTemplate(data: TemplateData) {
  const safeName = escapeHtml(data.candidateName);
  const safeEmail = data.candidateEmail ? escapeHtml(data.candidateEmail) : '';
  const safeJob = escapeHtml(data.jobTitle);
  const safeRound = escapeHtml(data.roundName);
  const safeMeet = data.meetUrl ? escapeHtml(data.meetUrl) : null;
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);
  
  const meetHtml = safeMeet 
    ? `<p><strong>Google Meet:</strong> <a href="${safeMeet}">${safeMeet}</a></p>`
    : `<p>Meeting details will be available shortly.</p>`;

  const html = `
    <h2>Interview Scheduled — ${safeName}</h2>
    <p>You have been scheduled for an interview.</p>
    <ul>
      <li><strong>Candidate:</strong> ${safeName} ${safeEmail ? `(${safeEmail})` : ''}</li>
      <li><strong>Role:</strong> ${safeJob}</li>
      <li><strong>Round:</strong> ${safeRound}</li>
      <li><strong>Date:</strong> ${dateStr}</li>
      <li><strong>Time:</strong> ${timeStr}</li>
    </ul>
    ${meetHtml}
  `;

  return {
    subject: `Interview Scheduled \u2014 ${data.candidateName}`,
    htmlBody: html,
  };
}

export function buildReminderTemplate(
  data: TemplateData,
  isCandidate: boolean,
  type: 'REMINDER_24_HOURS' | 'REMINDER_1_HOUR' | 'REMINDER_10_MINUTES'
) {
  const safeName = escapeHtml(data.candidateName);
  const safeEmail = data.candidateEmail ? escapeHtml(data.candidateEmail) : '';
  const safeJob = escapeHtml(data.jobTitle);
  const safeRound = escapeHtml(data.roundName);
  const safeMeet = data.meetUrl ? escapeHtml(data.meetUrl) : null;
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);

  const meetHtml = safeMeet 
    ? `<p><strong>Google Meet:</strong> <a href="${safeMeet}">${safeMeet}</a></p>`
    : `<p>Meeting details will be available shortly.</p>`;

  let candidateSubject = '';
  let interviewerSubject = '';

  if (type === 'REMINDER_24_HOURS') {
    candidateSubject = `Interview Reminder \u2014 Tomorrow`;
    interviewerSubject = `Upcoming Interview \u2014 Tomorrow`;
  } else if (type === 'REMINDER_1_HOUR') {
    candidateSubject = `Interview Reminder \u2014 In 1 Hour`;
    interviewerSubject = `Upcoming Interview \u2014 In 1 Hour`;
  } else {
    candidateSubject = `Interview Starting Soon \u2014 10 Minutes`;
    interviewerSubject = `Interview Starting Soon \u2014 10 Minutes`;
  }

  const subject = isCandidate ? candidateSubject : interviewerSubject;
  const manageHtml = (isCandidate && data.manageToken) 
    ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage-interview/${data.manageToken}">Manage your interview</a></p>`
    : '';

  const html = isCandidate
    ? `
      <h2>${candidateSubject}</h2>
      <p>Hi ${safeName},</p>
      <p>This is a reminder for your upcoming interview.</p>
      <ul>
        <li><strong>Role:</strong> ${safeJob}</li>
        <li><strong>Round:</strong> ${safeRound}</li>
        <li><strong>Date:</strong> ${dateStr}</li>
        <li><strong>Time:</strong> ${timeStr}</li>
      </ul>
      ${meetHtml}
      ${manageHtml}
    `
    : `
      <h2>${interviewerSubject}</h2>
      <p>This is a reminder for your upcoming interview.</p>
      <ul>
        <li><strong>Candidate:</strong> ${safeName} ${safeEmail ? `(${safeEmail})` : ''}</li>
        <li><strong>Role:</strong> ${safeJob}</li>
        <li><strong>Round:</strong> ${safeRound}</li>
        <li><strong>Date:</strong> ${dateStr}</li>
        <li><strong>Time:</strong> ${timeStr}</li>
      </ul>
      ${meetHtml}
    `;

  return { subject, htmlBody: html };
}
