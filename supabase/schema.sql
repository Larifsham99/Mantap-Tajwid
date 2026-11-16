-- =====================================================================
-- TAJWID PONDOK – Skema PostgreSQL (Supabase) dengan Row Level Security
-- Jalankan dalam Supabase SQL Editor. Idempoten setakat yang munasabah.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Peranan ----------
do $$ begin
  create type app_role as enum ('superadmin','admin','guru','pelajar','awam');
exception when duplicate_object then null; end $$;
do $$ begin
  create type review_status as enum ('draf','belum_disemak','disemak','diterbitkan');
exception when duplicate_object then null; end $$;

-- ---------- Pengguna & profil ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar text default '🙂',
  role app_role not null default 'pelajar',
  class_id uuid,
  bio text,
  created_at timestamptz default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table profiles drop constraint if exists profiles_class_fk;
alter table profiles add constraint profiles_class_fk foreign key (class_id) references classes(id) on delete set null;

-- Pandangan mudah untuk entiti "teachers" dan "students"
create or replace view teachers as select * from profiles where role in ('guru','admin','superadmin');
create or replace view students as select * from profiles where role = 'pelajar';

-- Fungsi bantuan peranan (SECURITY DEFINER supaya boleh dipanggil dalam polisi RLS)
create or replace function my_role() returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('guru','admin','superadmin'), false)
$$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('admin','superadmin'), false)
$$;
-- Guru boleh melihat pelajar dalam kelas yang diajarnya
create or replace function teaches(student uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p join classes c on c.id = p.class_id where p.id = student and c.teacher_id = auth.uid())
$$;

-- Profil dicipta automatik semasa pendaftaran (peranan admin TIDAK boleh dipilih sendiri)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          case when new.raw_user_meta_data->>'role' in ('guru','awam') then (new.raw_user_meta_data->>'role')::app_role else 'pelajar' end);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Halang pengguna menukar peranan sendiri
create or replace function guard_role_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if not is_admin() then raise exception 'Hanya admin boleh menukar peranan'; end if;
    if new.role in ('admin','superadmin') and my_role() <> 'superadmin' then raise exception 'Hanya super admin boleh melantik admin'; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_role_guard on profiles;
create trigger profiles_role_guard before update on profiles for each row execute function guard_role_change();

-- ---------- Kandungan tajwid ----------
create table if not exists tajwid_chapters (
  id text primary key, no int not null, title text not null, arab_title text, summary text
);
create table if not exists tajwid_notes (
  id text primary key, chapter_id text references tajwid_chapters(id) on delete cascade,
  title text not null, content jsonb not null, -- struktur NoteSection
  author_id uuid references profiles(id), status review_status default 'belum_disemak',
  updated_at timestamptz default now()
);
create table if not exists tajwid_terms (
  id uuid primary key default gen_random_uuid(), chapter_id text references tajwid_chapters(id), term text not null, arab text, definition text not null
);
create table if not exists "references" (
  id uuid primary key default gen_random_uuid(), chapter_id text references tajwid_chapters(id),
  kitab text not null, pengarang text not null, bab text, halaman text,
  status text not null default 'belum_disahkan' check (status in ('disahkan','belum_disahkan')),
  penyemak_id uuid references profiles(id)
);

-- ---------- Bank soalan ----------
create table if not exists question_banks (
  id uuid primary key default gen_random_uuid(), name text not null, source text not null check (source in ('tauliah','latihan','custom')),
  year int, penganjur text, instruction text, transcription_note text
);
create table if not exists questions (
  id text primary key, bank_id uuid references question_banks(id) on delete set null,
  source text not null, type text not null check (type in ('mcq','tf','fill','match','subjective')),
  kind text, chapter_id text references tajwid_chapters(id), difficulty int check (difficulty between 1 and 3), marks numeric default 1,
  prompt text not null, arabic text, arabic_ref text, year int, section text, q_no int, part text,
  status review_status not null default 'draf', reviewer_id uuid references profiles(id), review_note text,
  created_by uuid references profiles(id), updated_at timestamptz default now()
);
create table if not exists question_options (
  id uuid primary key default gen_random_uuid(), question_id text references questions(id) on delete cascade,
  label text not null, text text not null, why text, is_correct boolean default false
);
create table if not exists question_answers (
  question_id text primary key references questions(id) on delete cascade, answer jsonb, model_answer text
);
create table if not exists answer_explanations (
  question_id text primary key references questions(id) on delete cascade,
  why text, concept text, identify text, dhobit text, examples jsonb, confusion text, compare text, refs jsonb
);

-- ---------- Latihan, ujian & kemajuan ----------
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(), title text not null, mode text, question_ids text[] not null, created_by uuid references profiles(id), created_at timestamptz default now()
);
create table if not exists exercise_attempts (
  id text primary key, user_id uuid not null references profiles(id) on delete cascade, question_id text not null,
  chapter_id text, correct boolean not null, score numeric not null, given text, mode text, ms int, created_at timestamptz default now()
);
create table if not exists exam_sessions (
  id text primary key, user_id uuid not null references profiles(id) on delete cascade, title text, config jsonb, question_ids text[],
  answers jsonb default '{}'::jsonb, started_at timestamptz, submitted_at timestamptz, score numeric, max_score numeric, status text
);
create table if not exists exam_answers (
  id uuid primary key default gen_random_uuid(), exam_id text references exam_sessions(id) on delete cascade, question_id text,
  value text, correct boolean, self_score numeric, teacher_score numeric, teacher_comment text, graded_by uuid references profiles(id)
);
create table if not exists student_progress (
  user_id uuid references profiles(id) on delete cascade, chapter_id text, sections_read text[] default '{}', last_section text, updated_at timestamptz default now(),
  primary key (user_id, chapter_id)
);
create table if not exists mastery_records (
  user_id uuid references profiles(id) on delete cascade, chapter_id text, accuracy int, attempts int, mastered boolean, updated_at timestamptz default now(),
  primary key (user_id, chapter_id)
);
create table if not exists review_queue (
  user_id uuid references profiles(id) on delete cascade, question_id text, box int default 0, due timestamptz, lapses int default 0, saved boolean default false,
  primary key (user_id, question_id)
);
create table if not exists xp_transactions (
  id text primary key, user_id uuid not null references profiles(id) on delete cascade, amount int not null, reason text, created_at timestamptz default now()
);
create table if not exists badges (id text primary key, name text not null, icon text, description text, active boolean default true);
create table if not exists user_badges (
  user_id uuid references profiles(id) on delete cascade, badge_id text references badges(id), awarded_at timestamptz default now(), primary key (user_id, badge_id)
);
create or replace view leaderboards as
  select p.id as user_id, p.name, p.class_id, coalesce(sum(x.amount),0) as xp,
         coalesce(sum(x.amount) filter (where x.created_at >= date_trunc('week', now())),0) as xp_week
  from profiles p left join xp_transactions x on x.user_id = p.id where p.role = 'pelajar' group by p.id;

-- ---------- AI, tugasan & semakan ----------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, mode text, title text, messages jsonb default '[]', created_at timestamptz default now()
);
create table if not exists ai_feedback (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, conversation_id uuid references ai_conversations(id) on delete cascade,
  msg_index int, excerpt text, reason text, status text default 'baru', reviewer_id uuid references profiles(id), reviewer_note text, created_at timestamptz default now()
);
create table if not exists teacher_assignments (
  id uuid primary key default gen_random_uuid(), class_id uuid references classes(id) on delete cascade, teacher_id uuid references profiles(id),
  title text not null, question_ids text[] not null, due date, note text, created_at timestamptz default now()
);
create table if not exists content_reviews (
  id uuid primary key default gen_random_uuid(), target_type text, target_id text, action text, by_id uuid references profiles(id), note text, created_at timestamptz default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table classes enable row level security;
alter table tajwid_chapters enable row level security;
alter table tajwid_notes enable row level security;
alter table tajwid_terms enable row level security;
alter table "references" enable row level security;
alter table question_banks enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table question_answers enable row level security;
alter table answer_explanations enable row level security;
alter table exercises enable row level security;
alter table exercise_attempts enable row level security;
alter table exam_sessions enable row level security;
alter table exam_answers enable row level security;
alter table student_progress enable row level security;
alter table mastery_records enable row level security;
alter table review_queue enable row level security;
alter table xp_transactions enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table ai_conversations enable row level security;
alter table ai_feedback enable row level security;
alter table teacher_assignments enable row level security;
alter table content_reviews enable row level security;

-- Profil: baca diri sendiri / pelajar kelas (guru) / semua (admin); kemas kini diri sendiri atau admin
drop policy if exists p_profiles_read on profiles;
create policy p_profiles_read on profiles for select using (id = auth.uid() or teaches(id) or is_admin() or role = 'pelajar');
drop policy if exists p_profiles_update on profiles;
create policy p_profiles_update on profiles for update using (id = auth.uid() or is_admin());
drop policy if exists p_profiles_delete on profiles;
create policy p_profiles_delete on profiles for delete using (is_admin());

drop policy if exists p_classes_read on classes;
create policy p_classes_read on classes for select using (auth.uid() is not null);
drop policy if exists p_classes_write on classes;
create policy p_classes_write on classes for all using (is_admin()) with check (is_admin());

-- Kandungan awam: semua pengguna log masuk boleh membaca yang telah disemak/diterbitkan; staf boleh menulis
do $$ declare t text; begin
  foreach t in array array['tajwid_chapters','tajwid_terms','"references"','question_banks','question_options','question_answers','answer_explanations'] loop
    execute format('drop policy if exists p_read on %s', t);
    execute format('create policy p_read on %s for select using (auth.uid() is not null)', t);
    execute format('drop policy if exists p_write on %s', t);
    execute format('create policy p_write on %s for all using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

drop policy if exists p_notes_read on tajwid_notes;
create policy p_notes_read on tajwid_notes for select using (status in ('disemak','diterbitkan') or is_staff());
drop policy if exists p_notes_write on tajwid_notes;
create policy p_notes_write on tajwid_notes for all using (is_staff()) with check (is_staff());

-- Soalan: pelajar hanya melihat yang bukan draf. Hanya admin boleh menetapkan status 'diterbitkan'.
drop policy if exists p_q_read on questions;
create policy p_q_read on questions for select using (status <> 'draf' or is_staff());
drop policy if exists p_q_write on questions;
create policy p_q_write on questions for all using (is_staff()) with check (is_staff() and (status <> 'diterbitkan' or is_admin()));

-- Data peribadi pelajar: pemilik, guru kelasnya, atau admin
do $$ declare t text; begin
  foreach t in array array['exercise_attempts','exam_sessions','student_progress','mastery_records','review_queue','user_badges','ai_conversations'] loop
    execute format('drop policy if exists p_own on %s', t);
    execute format('create policy p_own on %s for all using (user_id = auth.uid() or teaches(user_id) or is_admin()) with check (user_id = auth.uid() or is_admin())', t);
  end loop;
end $$;
-- XP hanya boleh ditambah oleh pemilik (atau admin) dan tidak boleh disunting oleh pelajar
drop policy if exists p_xp_read on xp_transactions;
create policy p_xp_read on xp_transactions for select using (auth.uid() is not null);
drop policy if exists p_xp_insert on xp_transactions;
create policy p_xp_insert on xp_transactions for insert with check ((user_id = auth.uid() and amount between 0 and 200) or is_admin());
drop policy if exists p_xp_admin on xp_transactions;
create policy p_xp_admin on xp_transactions for update using (is_admin());

drop policy if exists p_exam_answers on exam_answers;
create policy p_exam_answers on exam_answers for all using (exists (select 1 from exam_sessions e where e.id = exam_id and (e.user_id = auth.uid() or teaches(e.user_id) or is_admin())));

drop policy if exists p_badges_read on badges;
create policy p_badges_read on badges for select using (true);
drop policy if exists p_badges_write on badges;
create policy p_badges_write on badges for all using (is_admin()) with check (is_admin());

drop policy if exists p_fb on ai_feedback;
create policy p_fb on ai_feedback for select using (user_id = auth.uid() or is_staff());
drop policy if exists p_fb_ins on ai_feedback;
create policy p_fb_ins on ai_feedback for insert with check (user_id = auth.uid());
drop policy if exists p_fb_upd on ai_feedback;
create policy p_fb_upd on ai_feedback for update using (is_staff());

drop policy if exists p_assign_read on teacher_assignments;
create policy p_assign_read on teacher_assignments for select using (is_staff() or class_id = (select class_id from profiles where id = auth.uid()));
drop policy if exists p_assign_write on teacher_assignments;
create policy p_assign_write on teacher_assignments for all using (teacher_id = auth.uid() or is_admin()) with check (is_staff());

drop policy if exists p_cr on content_reviews;
create policy p_cr on content_reviews for all using (is_staff()) with check (is_staff());

-- Storage: baldi peribadi untuk dokumen import (hanya staf)
insert into storage.buckets (id, name, public) values ('imports', 'imports', false) on conflict do nothing;
drop policy if exists p_imports on storage.objects;
create policy p_imports on storage.objects for all using (bucket_id = 'imports' and is_staff()) with check (bucket_id = 'imports' and is_staff());

-- Lencana asas (sepadan dengan src/lib/gamification.ts)
insert into badges (id, name, icon, description) values
 ('asas','Asas Tajwid','📗','Baca semua seksyen nota Bab 1'),
 ('nun','Penguasa Nun Sakinah','ن','Kuasai Bab 4'),
 ('mad','Master Mad','〰️','Kuasai Bab 9'),
 ('makharij','Penguasa Makharij','👄','Kuasai Bab 2'),
 ('dhobit','Ahli Dhobit','🔑','Jawab betul 20 soalan dhobit'),
 ('seratus','100 Soalan Betul','💯','Kumpul 100 jawapan betul'),
 ('istiqamah7','7 Hari Istiqamah','🔥','Belajar 7 hari berturut-turut'),
 ('murajaah30','30 Hari Murajaah','🌙','Murajaah pada 30 hari berbeza'),
 ('semua','Penguasaan Semua Bab','👑','Kuasai kesemua 12 bab'),
 ('simulasi','Simulasi Pertama','📝','Hantar satu simulasi'),
 ('tauliah10','Pejuang Tauliah','🗂️','Jawab 10 soalan tauliah sebenar')
on conflict (id) do nothing;
