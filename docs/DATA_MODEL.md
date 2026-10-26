# Rancangan Data Model

Rancangan untuk Supabase Postgres (Fase 2). **Belum diterapkan**; prototipe Fase 0–1 memakai `DataStore` di memori dengan bentuk yang sama (`src/domain/types.ts`). SQL di bawah adalah draf desain untuk direview, bukan migrasi final.

## Prinsip

- Percakapan asli (`conversations`, `messages`) dan sumber asli (`knowledge_sources`) **terpisah** dari pengetahuan terstruktur (`knowledge_items`, `knowledge_versions`).
- Setiap versi pengetahuan menunjuk ke sumbernya; versi tidak pernah ditimpa.
- Perubahan status hanya lewat `approval_events` (append-only), dijalankan fungsi server yang mengecek peran.
- `audit_events` append-only, tanpa isi pengetahuan.
- Semua tabel punya `created_at`; tabel yang bisa berubah punya `updated_at`.
- RLS aktif di semua tabel; kebijakan mencerminkan `src/domain/permissions.ts`.

## Tabel

| Tabel | Isi utama |
| --- | --- |
| `departments` | id, nama |
| `profiles` | id (= auth.users.id), nama, jabatan, department_id, active |
| `role_assignments` | profile_id, role, department_id (opsional), granted_by |
| `knowledge_items` | id, judul, ringkasan, kategori, tipe, klasifikasi, department_id, status, bahasa, contributor_id, owner_id, reviewer_id, current_version, review_due_at, superseded_by |
| `knowledge_versions` | item_id, version, judul, ringkasan, sections (jsonb), missing_info (jsonb), edited_by, change_note |
| `knowledge_sources` | id, kind, judul, original_text, conversation_id, storage_path, created_by |
| `knowledge_item_sources` | item_id, source_id |
| `conversations` | id, contributor_id, status, item_id, retention_until |
| `messages` | conversation_id, role, text, question_id |
| `clarification_questions` | conversation_id, gap, text, state, answer_message_id |
| `knowledge_relationships` | from_id, to_id, type, verified, created_by |
| `reviews` | item_id, reviewer_id, assigned_at, due_at |
| `approval_events` | item_id, actor_id, action, from_status, to_status, note |
| `decisions` | field PRD 2.5 + klasifikasi, department_id, missing_info |
| `decision_references` | decision_id, item_id |
| `tasks` | action, reason, proposed_owner_id, due_at, source_item_id, status (draf sampai diterima) |
| `knowledge_access_grants` | item_id, profile_id, granted_by, reason, expires_at |
| `audit_events` | actor_id, action, target_type, target_id, outcome, meta (jsonb) |
| `evaluation_cases` | judul, kategori, actor_profile_id, pertanyaan, target_item_id, expected, expected_behavior |
| `evaluation_runs` | case_id, evaluator_id, ran_at, actual_summary, evidence_quality, passed |

## Draf SQL inti

```sql
create type knowledge_status as enum ('captured','ai_draft','pending_review','verified','approved_official','superseded','archived');
create type knowledge_type as enum ('personal_experience','management_directive','approved_policy','technical_standard','historical_record','lesson_learned','general_knowledge');
create type access_class as enum ('general_internal','department_restricted','confidential','highly_confidential');

create table knowledge_items (
  id text primary key,                       -- K-0001
  title text not null check (char_length(title) between 3 and 200),
  summary text not null,
  category text not null,
  type knowledge_type not null,
  classification access_class not null default 'department_restricted',
  department_id text not null references departments(id),
  status knowledge_status not null default 'captured',
  language text not null default 'id' check (language in ('id','en','ja')),
  contributor_id uuid not null references profiles(id),
  owner_id uuid references profiles(id),
  reviewer_id uuid references profiles(id),
  current_version int not null default 1,
  review_due_at date,
  superseded_by text references knowledge_items(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on knowledge_items (status, classification, department_id);
create index on knowledge_items (category);

create table approval_events (
  id bigint generated always as identity primary key,
  item_id text not null references knowledge_items(id),
  actor_id uuid not null references profiles(id),
  action text not null,
  from_status knowledge_status not null,
  to_status knowledge_status not null,
  note text not null default '',
  at timestamptz not null default now()
);
-- append-only: tidak ada policy UPDATE/DELETE untuk peran aplikasi.

create table knowledge_access_grants (
  item_id text not null references knowledge_items(id),
  profile_id uuid not null references profiles(id),
  granted_by uuid not null references profiles(id),
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (item_id, profile_id)
);

-- Contoh RLS baca (disederhanakan; fungsi helper SECURITY DEFINER membaca role_assignments):
alter table knowledge_items enable row level security;
create policy knowledge_read on knowledge_items for select using (
  contributor_id = auth.uid() or owner_id = auth.uid() or reviewer_id = auth.uid()
  or exists (select 1 from knowledge_access_grants g where g.item_id = id and g.profile_id = auth.uid()
             and (g.expires_at is null or g.expires_at > now()))
  or dni_classification_allows(auth.uid(), classification, department_id)
);
```

## Retensi (usulan, perlu persetujuan)

- Percakapan capture yang menjadi sumber pengetahuan: disimpan selama pengetahuannya ada.
- Riwayat chat Tanya DNI: 90 hari, lalu dihapus otomatis.
- Audit log: 3 tahun, lalu diarsipkan; tanpa isi pengetahuan sehingga aman disimpan lebih lama.
- Catatan historis tidak kedaluwarsa.
