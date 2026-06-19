insert into storage.buckets (id, name, public, file_size_limit)
values ('request-documents', 'request-documents', false, 10485760)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760;

create table if not exists public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  uploaded_by_role text not null check (uploaded_by_role in ('admin', 'client')),
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size int,
  created_at timestamptz not null default now()
);

alter table public.request_documents enable row level security;

drop policy if exists "request documents read for admin or owner" on public.request_documents;
create policy "request documents read for admin or owner"
on public.request_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
  or exists (
    select 1
    from public.contact_requests
    where contact_requests.id = request_documents.request_id
      and contact_requests.user_id = auth.uid()
  )
);

drop policy if exists "clients insert own request documents" on public.request_documents;
create policy "clients insert own request documents"
on public.request_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and uploaded_by_role = 'client'
  and exists (
    select 1
    from public.contact_requests
    where contact_requests.id = request_documents.request_id
      and contact_requests.user_id = auth.uid()
  )
);

drop policy if exists "admins insert request documents" on public.request_documents;
create policy "admins insert request documents"
on public.request_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and uploaded_by_role = 'admin'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "request document files read for admin or owner" on storage.objects;
create policy "request document files read for admin or owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'request-documents'
  and (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
    or exists (
      select 1
      from public.contact_requests
      where contact_requests.id = ((storage.foldername(name))[1])::uuid
        and contact_requests.user_id = auth.uid()
    )
  )
);

drop policy if exists "request document files upload for admin or owner" on storage.objects;
create policy "request document files upload for admin or owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'request-documents'
  and lower(storage.extension(name)) in ('pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx')
  and (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
    or exists (
      select 1
      from public.contact_requests
      where contact_requests.id = ((storage.foldername(name))[1])::uuid
        and contact_requests.user_id = auth.uid()
    )
  )
);
