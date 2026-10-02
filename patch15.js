const fs = require('fs');
let code = fs.readFileSync('lib/db/interview-requests.ts', 'utf-8');

code = code.replace(
  'const { data, error } = await createDatabaseAdmin().from("interview_scheduling_requests").select("*").order("created_at", { ascending: false });',
  'const { data, error } = await createDatabaseAdmin().from("interview_scheduling_requests").select("*, interviews(id)").order("created_at", { ascending: false });'
);

code = code.replace(
  'return (data ?? []).map(toInterviewRequest);',
  `return (data ?? []).map(row => {
    const req = toInterviewRequest(row);
    if (row.interviews && Array.isArray(row.interviews) && row.interviews.length > 0) {
      req.status = "SCHEDULED";
    }
    return req;
  });`
);

fs.writeFileSync('lib/db/interview-requests.ts', code);
