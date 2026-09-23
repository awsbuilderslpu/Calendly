create table if not exists public.interview_scheduling_requests (
  id uuid primary key default gen_random_uuid(),
  external_request_id text not null unique,
  application_id text not null,
  candidate_id text not null,
  candidate_name text not null,
  candidate_email text not null,
  job_id text not null,
  job_title text not null,
  round_name text not null,
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60, 90, 120)),
  panel_id uuid,
  available_from date,
  available_until date,
  status text not null default 'PENDING' check (status in ('PENDING', 'OPEN', 'SCHEDULED', 'CANCELLED', 'EXPIRED')),
  requested_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_requests_status_idx on public.interview_scheduling_requests (status);
create index if not exists interview_requests_application_idx on public.interview_scheduling_requests (application_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null,
  resource text not null,
  resource_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_resource_idx on public.audit_logs (resource, resource_id);

create table if not exists public.panels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  required_interviewers integer not null default 1 check (required_interviewers between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_scheduling_requests
  add column if not exists panel_id uuid references public.panels(id) on delete set null,
  add column if not exists available_from date,
  add column if not exists available_until date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'interview_request_window_check'
      and conrelid = 'public.interview_scheduling_requests'::regclass
  ) then
    alter table public.interview_scheduling_requests
      add constraint interview_request_window_check
      check (available_until is null or available_from is null or available_until >= available_from);
  end if;
end $$;

create table if not exists public.panel_members (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid not null references public.panels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (panel_id, user_id)
);

create index if not exists panel_members_panel_idx on public.panel_members (panel_id);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists availability_rules_user_day_idx on public.availability_rules (user_id, day_of_week);

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists availability_exceptions_user_date_idx on public.availability_exceptions (user_id, date);

create table if not exists public.scheduling_links (
  id uuid primary key default gen_random_uuid(),
  scheduling_request_id uuid not null references public.interview_scheduling_requests(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists scheduling_links_one_active_idx
  on public.scheduling_links (scheduling_request_id)
  where revoked_at is null and used_at is null;

create index if not exists scheduling_links_expiry_idx on public.scheduling_links (expires_at);

create extension if not exists btree_gist;

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  scheduling_request_id uuid not null references public.interview_scheduling_requests(id),
  scheduling_link_id uuid not null references public.scheduling_links(id),
  idempotency_key text not null,
  candidate_id text not null,
  candidate_name text not null,
  candidate_email text not null,
  job_id text not null,
  job_title text not null,
  round_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (scheduling_link_id, idempotency_key)
);

create table if not exists public.interview_panel_members (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (interview_id, user_id)
);

create table if not exists public.interview_bookings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  interviewer_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (
    interviewer_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'SCHEDULED')
);

create index if not exists interviews_request_idx on public.interviews (scheduling_request_id);
create index if not exists interviews_start_idx on public.interviews (starts_at);

alter table public.interviews
  add column if not exists calendar_provider text,
  add column if not exists google_calendar_id text,
  add column if not exists google_event_id text,
  add column if not exists google_meet_url text,
  add column if not exists google_conference_id text,
  add column if not exists calendar_sync_status text not null default 'PENDING' check (calendar_sync_status in ('PENDING', 'SYNCED', 'FAILED')),
  add column if not exists calendar_sync_error text,
  add column if not exists calendar_synced_at timestamptz;

create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  google_account_id text,
  email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  selected_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_calendar_connections_account_idx on public.google_calendar_connections (google_account_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  type text not null check (type in ('BOOKING_CONFIRMATION_CANDIDATE', 'BOOKING_CONFIRMATION_INTERVIEWER', 'REMINDER_24_HOURS', 'REMINDER_1_HOUR', 'REMINDER_10_MINUTES')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  provider text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, recipient_email, type)
);

create index if not exists notifications_interview_idx on public.notifications (interview_id);
create index if not exists notifications_status_due_idx on public.notifications (status, scheduled_for);
create index if not exists notifications_recipient_idx on public.notifications (recipient_email);

create or replace function public.claim_due_notifications(p_limit integer default 20)
returns setof public.notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select id from public.notifications
    where status = 'PENDING'
      and (scheduled_for is null or scheduled_for <= now())
    order by coalesce(scheduled_for, created_at), created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.notifications n
  set status = 'PROCESSING', attempt_count = n.attempt_count + 1, updated_at = now()
  from claimed
  where n.id = claimed.id
  returning n.*;
end;
$$;

create or replace function public.book_interview(
  p_scheduling_request_id uuid,
  p_scheduling_link_id uuid,
  p_idempotency_key text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_interviewer_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $
declare
  existing public.interviews;
  created public.interviews;
  v_request public.interview_scheduling_requests;
  v_sc_version integer;
  interviewer uuid;
begin
  select * into existing from public.interviews
    where scheduling_link_id = p_scheduling_link_id and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('id', existing.id, 'created', false); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scheduling_request_id::text || ':' || p_starts_at::text, 0));
  
  if exists (select 1 from public.scheduling_links where id = p_scheduling_link_id and (used_at is not null or revoked_at is not null or expires_at <= now())) then
    raise exception using errcode = 'P0001', message = 'LINK_UNAVAILABLE';
  end if;
  
  select * into v_request from public.interview_scheduling_requests where id = p_scheduling_request_id;
  if not found or v_request.status != 'OPEN' then
    raise exception using errcode = 'P0001', message = 'REQUEST_UNAVAILABLE';
  end if;

  if v_request.scorecard_template_id is not null then
    select version into v_sc_version from public.scorecard_templates where id = v_request.scorecard_template_id;
  end if;

  insert into public.interviews (
    scheduling_request_id, scheduling_link_id, idempotency_key, 
    candidate_id, candidate_name, candidate_email, job_id, job_title, round_name, 
    starts_at, ends_at, timezone, scorecard_template_id, scorecard_version
  )
  values (
    v_request.id, p_scheduling_link_id, p_idempotency_key, 
    v_request.candidate_id, v_request.candidate_name, v_request.candidate_email, v_request.job_id, v_request.job_title, v_request.round_name, 
    p_starts_at, p_ends_at, p_timezone, v_request.scorecard_template_id, v_sc_version
  ) returning * into created;

  foreach interviewer in array p_interviewer_ids loop
    insert into public.interview_panel_members (interview_id, user_id) values (created.id, interviewer);
    insert into public.interview_bookings (interview_id, interviewer_id, starts_at, ends_at) values (created.id, interviewer, p_starts_at, p_ends_at);
  end loop;
  
  if array_length(p_interviewer_ids, 1) is null or array_length(p_interviewer_ids, 1) = 0 then raise exception using errcode = 'P0001', message = 'NO_INTERVIEWERS'; end if;
  
  update public.scheduling_links set used_at = now(), updated_at = now() where id = p_scheduling_link_id and used_at is null and revoked_at is null;
  if not found then raise exception using errcode = 'P0001', message = 'LINK_UNAVAILABLE'; end if;
  
  -- Record BOOKED event
  insert into public.interview_events (interview_id, event_type, actor_type, metadata)
  values (created.id, 'BOOKED', 'CANDIDATE', jsonb_build_object('startsAt', p_starts_at, 'endsAt', p_ends_at));

  return jsonb_build_object('id', created.id, 'created', true);
exception when exclusion_violation then
  raise exception using errcode = '23P01', message = 'SLOT_UNAVAILABLE';
end;
$;

-- PHASE 8: Rescheduling & Cancellation

alter table public.interviews
  add column if not exists schedule_version integer not null default 1;

alter table public.notifications
  add column if not exists schedule_version integer not null default 1;

-- Drop check constraint on notifications type to allow new types
alter table public.notifications drop constraint if exists notifications_type_check;

create table if not exists public.interview_events (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  event_type text not null,
  actor_type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists interview_events_interview_idx on public.interview_events (interview_id);

create table if not exists public.interview_action_tokens (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  token_hash text not null unique,
  action_type text not null check (action_type in ('RESCHEDULE', 'CANCEL', 'MANAGE')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists interview_action_tokens_interview_idx on public.interview_action_tokens (interview_id);
create index if not exists interview_action_tokens_hash_idx on public.interview_action_tokens (token_hash);

-- Modify book_interview to record BOOKED event and create a MANAGE token
create or replace function public.book_interview(
  p_scheduling_request_id uuid,
  p_scheduling_link_id uuid,
  p_idempotency_key text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_interviewer_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.interviews;
  created public.interviews;
  interviewer uuid;
begin
  select * into existing from public.interviews
    where scheduling_link_id = p_scheduling_link_id and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('id', existing.id, 'created', false); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scheduling_request_id::text || ':' || p_starts_at::text, 0));
  if exists (select 1 from public.scheduling_links where id = p_scheduling_link_id and (used_at is not null or revoked_at is not null or expires_at <= now())) then
    raise exception using errcode = 'P0001', message = 'LINK_UNAVAILABLE';
  end if;
  if not exists (select 1 from public.interview_scheduling_requests where id = p_scheduling_request_id and status = 'OPEN') then
    raise exception using errcode = 'P0001', message = 'REQUEST_UNAVAILABLE';
  end if;

  insert into public.interviews (scheduling_request_id, scheduling_link_id, idempotency_key, candidate_id, candidate_name, candidate_email, job_id, job_title, round_name, starts_at, ends_at, timezone)
  select id, p_scheduling_link_id, p_idempotency_key, candidate_id, candidate_name, candidate_email, job_id, job_title, round_name, p_starts_at, p_ends_at, p_timezone
  from public.interview_scheduling_requests where id = p_scheduling_request_id returning * into created;

  foreach interviewer in array p_interviewer_ids loop
    insert into public.interview_panel_members (interview_id, user_id) values (created.id, interviewer);
    insert into public.interview_bookings (interview_id, interviewer_id, starts_at, ends_at) values (created.id, interviewer, p_starts_at, p_ends_at);
  end loop;
  if array_length(p_interviewer_ids, 1) is null or array_length(p_interviewer_ids, 1) = 0 then raise exception using errcode = 'P0001', message = 'NO_INTERVIEWERS'; end if;
  update public.scheduling_links set used_at = now(), updated_at = now() where id = p_scheduling_link_id and used_at is null and revoked_at is null;
  if not found then raise exception using errcode = 'P0001', message = 'LINK_UNAVAILABLE'; end if;
  
  -- Record BOOKED event
  insert into public.interview_events (interview_id, event_type, actor_type, metadata)
  values (created.id, 'BOOKED', 'CANDIDATE', jsonb_build_object('startsAt', p_starts_at, 'endsAt', p_ends_at));

  return jsonb_build_object('id', created.id, 'created', true);
exception when exclusion_violation then
  raise exception using errcode = '23P01', message = 'SLOT_UNAVAILABLE';
end;
$$;

create or replace function public.cancel_interview(
  p_interview_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interview public.interviews;
  v_cutoff_hours int := 2; -- Configurable if needed via settings table, hardcoding default for now
begin
  select * into v_interview from public.interviews where id = p_interview_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  
  if v_interview.status = 'CANCELLED' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  if p_actor_type = 'CANDIDATE' and v_interview.starts_at < now() + (v_cutoff_hours || ' hours')::interval then
    raise exception 'CUTOFF';
  end if;

  -- Update interview
  update public.interviews 
  set status = 'CANCELLED', updated_at = now()
  where id = p_interview_id;

  -- Update bookings
  update public.interview_bookings 
  set status = 'CANCELLED'
  where interview_id = p_interview_id;

  -- Record event
  insert into public.interview_events (interview_id, event_type, actor_type, actor_user_id, metadata)
  values (p_interview_id, 'CANCELLED', p_actor_type, p_actor_id, jsonb_build_object(
    'reason', p_reason,
    'previousStartsAt', v_interview.starts_at,
    'previousEndsAt', v_interview.ends_at
  ));

  return true;
end;
$$;

create or replace function public.reschedule_interview(
  p_interview_id uuid,
  p_idempotency_key text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_interviewer_ids uuid[],
  p_actor_type text,
  p_actor_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interview public.interviews;
  v_cutoff_hours int := 24;
  v_old_starts timestamptz;
  v_old_ends timestamptz;
  v_old_interviewers uuid[];
  v_new_version int;
  interviewer uuid;
begin
  select * into v_interview from public.interviews where id = p_interview_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if v_interview.status = 'CANCELLED' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  if p_actor_type = 'CANDIDATE' and v_interview.starts_at < now() + (v_cutoff_hours || ' hours')::interval then
    raise exception 'CUTOFF';
  end if;

  if v_interview.starts_at = p_starts_at and v_interview.ends_at = p_ends_at then
    return jsonb_build_object('id', p_interview_id, 'scheduleVersion', v_interview.schedule_version);
  end if;

  v_old_starts := v_interview.starts_at;
  v_old_ends := v_interview.ends_at;

  select array_agg(user_id) into v_old_interviewers from public.interview_panel_members where interview_id = p_interview_id;

  -- Lock slot globally for the new time and request
  perform pg_advisory_xact_lock(hashtextextended(v_interview.scheduling_request_id::text || ':' || p_starts_at::text, 0));

  v_new_version := v_interview.schedule_version + 1;

  -- Update interview time and version
  update public.interviews 
  set starts_at = p_starts_at, ends_at = p_ends_at, timezone = p_timezone, schedule_version = v_new_version, updated_at = now()
  where id = p_interview_id;

  -- Delete old bookings and assignments
  delete from public.interview_bookings where interview_id = p_interview_id;
  delete from public.interview_panel_members where interview_id = p_interview_id;

  -- Re-insert bookings
  foreach interviewer in array p_interviewer_ids loop
    insert into public.interview_panel_members (interview_id, user_id) values (p_interview_id, interviewer);
    insert into public.interview_bookings (interview_id, interviewer_id, starts_at, ends_at) values (p_interview_id, interviewer, p_starts_at, p_ends_at);
  end loop;

  -- Insert event
  insert into public.interview_events (interview_id, event_type, actor_type, actor_user_id, metadata)
  values (p_interview_id, 'RESCHEDULED', p_actor_type, p_actor_id, jsonb_build_object(
    'reason', p_reason,
    'oldStartsAt', v_old_starts,
    'oldEndsAt', v_old_ends,
    'newStartsAt', p_starts_at,
    'newEndsAt', p_ends_at,
    'oldInterviewerIds', v_old_interviewers,
    'newInterviewerIds', p_interviewer_ids,
    'scheduleVersion', v_new_version
  ));

  -- Return updated subset
  return jsonb_build_object(
    'id', p_interview_id,
    'scheduleVersion', v_new_version
  );
exception when exclusion_violation then
  raise exception using errcode = '23P01', message = 'SLOT_UNAVAILABLE';
end;
$$;

-- PHASE 9: Feedback & Scorecards

create table if not exists public.scorecard_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  job_role text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scorecard_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.scorecard_templates(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.scorecard_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.scorecard_sections(id) on delete cascade,
  question text not null,
  description text,
  response_type text not null check (response_type in ('RATING', 'TEXT', 'BOOLEAN')),
  required boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

alter table public.interview_scheduling_requests
  add column if not exists scorecard_template_id uuid references public.scorecard_templates(id) on delete set null;

alter table public.interviews
  add column if not exists scorecard_template_id uuid references public.scorecard_templates(id) on delete set null,
  add column if not exists scorecard_version integer;

create table if not exists public.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  interviewer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('DRAFT', 'SUBMITTED')),
  overall_rating integer check (overall_rating is null or (overall_rating >= 1 and overall_rating <= 5)),
  recommendation text check (recommendation in ('STRONG_YES', 'YES', 'NO', 'STRONG_NO')),
  strengths text,
  concerns text,
  comments text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, interviewer_id)
);

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.interview_feedback(id) on delete cascade,
  question_id uuid not null references public.scorecard_questions(id) on delete cascade,
  rating_value integer check (rating_value is null or (rating_value >= 1 and rating_value <= 5)),
  text_value text,
  boolean_value boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feedback_id, question_id)
);

create or replace function public.submit_interview_feedback(
  p_feedback_id uuid,
  p_interviewer_id uuid,
  p_overall_rating integer,
  p_recommendation text,
  p_strengths text,
  p_concerns text,
  p_comments text,
  p_responses jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback public.interview_feedback;
  v_response jsonb;
  v_question_id uuid;
  v_rating integer;
  v_text text;
  v_boolean boolean;
begin
  select * into v_feedback from public.interview_feedback where id = p_feedback_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_feedback.interviewer_id != p_interviewer_id then raise exception 'FORBIDDEN'; end if;
  if v_feedback.status = 'SUBMITTED' then raise exception 'ALREADY_SUBMITTED'; end if;

  update public.interview_feedback set
    status = 'SUBMITTED',
    overall_rating = p_overall_rating,
    recommendation = p_recommendation,
    strengths = p_strengths,
    concerns = p_concerns,
    comments = p_comments,
    submitted_at = now(),
    updated_at = now()
  where id = p_feedback_id;

  for v_response in select * from jsonb_array_elements(p_responses) loop
    v_question_id := (v_response->>'question_id')::uuid;
    v_rating := (v_response->>'rating_value')::integer;
    v_text := v_response->>'text_value';
    v_boolean := (v_response->>'boolean_value')::boolean;

    insert into public.feedback_responses (feedback_id, question_id, rating_value, text_value, boolean_value)
    values (p_feedback_id, v_question_id, v_rating, v_text, v_boolean)
    on conflict (feedback_id, question_id) do update set
      rating_value = excluded.rating_value,
      text_value = excluded.text_value,
      boolean_value = excluded.boolean_value,
      updated_at = now();
  end loop;
  
  insert into public.interview_events (interview_id, event_type, actor_type, actor_user_id, metadata)
  values (v_feedback.interview_id, 'FEEDBACK_SUBMITTED', 'INTERVIEWER', p_interviewer_id, jsonb_build_object('feedback_id', p_feedback_id));

  return true;
end;
$$;

-- PHASE 10: Microsoft Calendar, WhatsApp, Provider Abstractions

create table if not exists public.microsoft_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  microsoft_account_id text,
  email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  selected_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, microsoft_account_id)
);

create table if not exists public.calendar_integrations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  provider text not null check (provider in ('GOOGLE', 'MICROSOFT')),
  external_event_id text,
  external_calendar_id text,
  meeting_provider text check (meeting_provider in ('GOOGLE_MEET', 'MICROSOFT_TEAMS', 'NONE')),
  meeting_url text,
  status text not null default 'PENDING' check (status in ('PENDING', 'SYNCED', 'FAILED', 'CANCELLED')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, provider)
);

-- Migrate Google Sync data if it exists in interviews
insert into public.calendar_integrations (interview_id, provider, external_event_id, external_calendar_id, meeting_provider, meeting_url, status, error)
select id, 'GOOGLE', google_event_id, google_calendar_id, 
  case when google_meet_url is not null then 'GOOGLE_MEET' else 'NONE' end,
  google_meet_url,
  case when calendar_sync_status = 'PENDING' then 'PENDING'
       when calendar_sync_status = 'SYNCED' then 'SYNCED'
       when calendar_sync_status = 'FAILED' then 'FAILED'
       when calendar_sync_status = 'CANCELLED' then 'CANCELLED'
       else 'PENDING' end,
  calendar_sync_error
from public.interviews
where calendar_provider = 'google'
on conflict (interview_id, provider) do nothing;

alter table public.notification_preferences
  add column if not exists whatsapp_enabled boolean not null default false;

alter table public.profiles
  add column if not exists phone_number text;

alter table public.notifications
  add column if not exists channel text not null default 'EMAIL' check (channel in ('EMAIL', 'WHATSAPP')),
  add column if not exists recipient_phone text;

-- Drop old notification unique constraint and create new one that includes channel
alter table public.notifications drop constraint if exists notifications_interview_id_recipient_email_type_key;
alter table public.notifications add constraint notifications_idempotency_key unique (interview_id, type, channel, recipient_email, recipient_phone);


alter table public.notifications alter column recipient_email drop not null;

-- PHASE 11 & 12: Analytics Indexes & Performance Hardening

create index if not exists interviews_starts_at_idx on public.interviews(starts_at);
create index if not exists interviews_status_idx on public.interviews(status);
create index if not exists interviews_created_at_idx on public.interviews(created_at);
create index if not exists interview_events_event_type_idx on public.interview_events(event_type);
create index if not exists interview_events_created_at_idx on public.interview_events(created_at);
create index if not exists interview_feedback_status_idx on public.interview_feedback(status);
create index if not exists notifications_status_idx on public.notifications(status);
create index if not exists notifications_scheduled_for_idx on public.notifications(scheduled_for);

-- Analytics RPC to aggregate dashboard metrics quickly
create or replace function public.get_recruiter_dashboard_metrics(
  p_start_date timestamptz,
  p_end_date timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheduled int;
  v_upcoming int;
  v_completed int;
  v_cancelled int;
  v_rescheduled int;
  v_pending_feedback int;
  v_feedback_submitted int;
  v_cal_synced int;
  v_cal_failed int;
  v_cal_pending int;
begin
  select count(*) into v_scheduled from public.interviews where created_at >= p_start_date and created_at <= p_end_date and status = 'SCHEDULED';
  select count(*) into v_upcoming from public.interviews where starts_at >= now() and starts_at <= p_end_date and status = 'SCHEDULED';
  select count(*) into v_completed from public.interviews where ends_at < now() and starts_at >= p_start_date and status = 'SCHEDULED';
  select count(*) into v_cancelled from public.interviews where updated_at >= p_start_date and updated_at <= p_end_date and status = 'CANCELLED';
  
  select count(*) into v_rescheduled from public.interview_events where created_at >= p_start_date and created_at <= p_end_date and event_type = 'RESCHEDULED';

  select count(*) into v_pending_feedback from public.interview_feedback where created_at >= p_start_date and created_at <= p_end_date and status = 'DRAFT';
  select count(*) into v_feedback_submitted from public.interview_feedback where created_at >= p_start_date and created_at <= p_end_date and status = 'SUBMITTED';

  select count(*) into v_cal_synced from public.calendar_integrations where updated_at >= p_start_date and updated_at <= p_end_date and status = 'SYNCED';
  select count(*) into v_cal_failed from public.calendar_integrations where updated_at >= p_start_date and updated_at <= p_end_date and status = 'FAILED';
  select count(*) into v_cal_pending from public.calendar_integrations where updated_at >= p_start_date and updated_at <= p_end_date and status = 'PENDING';

  return jsonb_build_object(
    'scheduled', v_scheduled,
    'upcoming', v_upcoming,
    'completed', v_completed,
    'cancelled', v_cancelled,
    'rescheduled', v_rescheduled,
    'feedback', jsonb_build_object('pending', v_pending_feedback, 'submitted', v_feedback_submitted),
    'calendar', jsonb_build_object('synced', v_cal_synced, 'failed', v_cal_failed, 'pending', v_cal_pending)
  );
end;
$$;
