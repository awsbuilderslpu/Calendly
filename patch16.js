const fs = require('fs');
let code = fs.readFileSync('lib/notifications/templates.ts', 'utf-8');

code = code.replace(
  /export function buildReminderTemplate[\s\S]*?\}\n/,
  `export function buildReminderTemplate(
  data: TemplateData,
  isCandidate: boolean,
  type: 'REMINDER_24_HOURS' | 'REMINDER_1_HOUR' | 'REMINDER_30_MINUTES' | 'REMINDER_10_MINUTES'
) {
  const dateStr = formatDate(data.startsAt, data.timezone);
  const timeStr = formatTimeRange(data.startsAt, data.endsAt, data.timezone);
  const meetStr = data.meetUrl ? data.meetUrl : "Meeting details will be shared shortly.";
  const manageLink = (isCandidate && data.manageToken) 
    ? \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage-interview/\${data.manageToken}\`
    : '';

  let candidateSubject = '';
  let interviewerSubject = '';

  if (type === 'REMINDER_24_HOURS') {
    candidateSubject = \`Interview Reminder — Tomorrow\`;
    interviewerSubject = \`Upcoming Interview — Tomorrow\`;
  } else if (type === 'REMINDER_1_HOUR') {
    candidateSubject = \`Interview Reminder — In 1 Hour\`;
    interviewerSubject = \`Upcoming Interview — In 1 Hour\`;
  } else if (type === 'REMINDER_30_MINUTES') {
    candidateSubject = \`Interview Reminder — In 30 Minutes\`;
    interviewerSubject = \`Upcoming Interview — In 30 Minutes\`;
  } else {
    candidateSubject = \`Interview Starting Soon — 10 Minutes\`;
    interviewerSubject = \`Interview Starting Soon — 10 Minutes\`;
  }

  const subject = isCandidate ? candidateSubject : interviewerSubject;
  
  const content = isCandidate
    ? \`This is a reminder for your upcoming interview.

Role: \${data.jobTitle}
Round: \${data.roundName}
Date: \${dateStr}
Time: \${timeStr}

Google Meet:
\${meetStr}

\${manageLink ? \`Manage your interview:\\n\${manageLink}\` : ''}\`
    : \`This is a reminder for your upcoming interview.

Candidate: \${data.candidateName} \${data.candidateEmail ? \`(\${data.candidateEmail})\` : ''}
Role: \${data.jobTitle}
Round: \${data.roundName}
Date: \${dateStr}
Time: \${timeStr}

Google Meet:
\${meetStr}\`;

  return { 
    subject, 
    greeting: isCandidate ? \`Hi \${data.candidateName},\` : "Hi Interviewer,",
    heading: subject,
    content,
    senderName: "AWS Student Builder Group",
    senderRole: "Recruitment Team",
    htmlBody: content.replace(/\\n/g, "<br>") 
  };
}
`
);
fs.writeFileSync('lib/notifications/templates.ts', code);
