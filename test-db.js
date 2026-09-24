const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  console.log("Profiles check:", { data, error });

  const { data: mc, error: mcError } = await supabase.from('microsoft_calendar_connections').select('id').limit(1);
  console.log("Microsoft table check:", { mc, error: mcError });
}
test();
