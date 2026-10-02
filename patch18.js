const fs = require('fs');
let code = fs.readFileSync('lib/notifications/dispatcher.ts', 'utf-8');

code = code.replace(
  "case 'REMINDER_1_HOUR':",
  "case 'REMINDER_1_HOUR':\n          case 'REMINDER_30_MINUTES':"
);

code = code.replace(
  "as \"REMINDER_24_HOURS\" | \"REMINDER_1_HOUR\" | \"REMINDER_10_MINUTES\"",
  "as \"REMINDER_24_HOURS\" | \"REMINDER_1_HOUR\" | \"REMINDER_30_MINUTES\" | \"REMINDER_10_MINUTES\""
);

fs.writeFileSync('lib/notifications/dispatcher.ts', code);
