const fs = require('fs');
let code = fs.readFileSync('lib/notifications/templates.ts', 'utf-8');
code = code.replace(
  "type: 'REMINDER_24_HOURS' | 'REMINDER_1_HOUR' | 'REMINDER_10_MINUTES'",
  "type: 'REMINDER_24_HOURS' | 'REMINDER_1_HOUR' | 'REMINDER_30_MINUTES' | 'REMINDER_10_MINUTES'"
);
code = code.replace(
  "} else if (type === 'REMINDER_1_HOUR') {",
  "} else if (type === 'REMINDER_1_HOUR') {\n    candidateSubject = `Interview Reminder \u2014 In 1 Hour`;\n    interviewerSubject = `Upcoming Interview \u2014 In 1 Hour`;\n  } else if (type === 'REMINDER_30_MINUTES') {"
);
code = code.replace(
  "candidateSubject = `Interview Reminder \u2014 In 1 Hour`;\n    interviewerSubject = `Upcoming Interview \u2014 In 1 Hour`;\n  } else if (type === 'REMINDER_30_MINUTES') {",
  "candidateSubject = `Interview Reminder \u2014 In 1 Hour`;\n    interviewerSubject = `Upcoming Interview \u2014 In 1 Hour`;\n  } else if (type === 'REMINDER_30_MINUTES') {\n    candidateSubject = `Interview Reminder \u2014 In 30 Minutes`;\n    interviewerSubject = `Upcoming Interview \u2014 In 30 Minutes`;\n  } else if (type === 'REMINDER_10_MINUTES') {"
);
// Wait, I might mess up the string replace. Let's write a safer one.
