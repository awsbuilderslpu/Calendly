const fs = require('fs');
let code = fs.readFileSync('lib/notifications/service.ts', 'utf-8');

code = code.replace(
  "{ type: 'REMINDER_1_HOUR', time: startsAt.minus({ hours: 1 }) },",
  "{ type: 'REMINDER_1_HOUR', time: startsAt.minus({ hours: 1 }) },\n    { type: 'REMINDER_30_MINUTES', time: startsAt.minus({ minutes: 30 }) },"
);

fs.writeFileSync('lib/notifications/service.ts', code);
