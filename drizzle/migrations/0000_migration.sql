create type public.app_role as enum ('admin', 'listener');
create type public.request_status as enum ('pending','approved','queued','playing','done','rejected');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- signup: profile + role. First user ever becomes admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'listener');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- settings (singleton)
create table public.station_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Rádio Online Pro',
  slogan text default 'Sua trilha sonora, 24 horas por dia',
  logo_url text,
  accent_color text default '#8b5cf6',
  mode text not null default 'library' check (mode in ('library','live')),
  stream_url text,
  live_program_active boolean not null default false,
  live_program_url text,
  live_program_title text,
  live_message text default 'Estamos em programação ao vivo',
  instagram text, facebook text, youtube text, tiktok text, whatsapp text,
  contact_email text, contact_phone text,
  requests_enabled boolean not null default true,
  youtube_requests_enabled boolean not null default true,
  max_requests_per_hour int not null default 3,
  request_rules text default 'Seja respeitoso. Pedidos repetidos ou ofensivos serão recusados.',
  active_playlist_id uuid,
  updated_at timestamptz not null default now()
);
insert into public.station_settings (id) values (1);
grant select on public.station_settings to anon, authenticated;
grant update on public.station_settings to authenticated;
grant all on public.station_settings to service_role;
alter table public.station_settings enable row level security;
create policy "public read settings" on public.station_settings for select to anon, authenticated using (true);
create policy "admin update settings" on public.station_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger t_settings_upd before update on public.station_settings for each row execute function public.touch_updated_at();

-- genres
create table public.genres (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
grant select on public.genres to anon, authenticated;
grant insert, update, delete on public.genres to authenticated;
grant all on public.genres to service_role;
alter table public.genres enable row level security;
create policy "public read genres" on public.genres for select to anon, authenticated using (true);
create policy "admin write genres" on public.genres for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- songs
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  album text,
  year int,
  genre_id uuid references public.genres(id) on delete set null,
  duration_sec numeric,
  file_path text not null,
  file_url text not null,
  cover_url text,
  mime_type text,
  size_bytes bigint,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index songs_title_idx on public.songs (lower(title));
create index songs_artist_idx on public.songs (lower(artist));
create index songs_created_idx on public.songs (created_at desc);
grant select on public.songs to anon, authenticated;
grant insert, update, delete on public.songs to authenticated;
grant all on public.songs to service_role;
alter table public.songs enable row level security;
create policy "public read active songs" on public.songs for select to anon, authenticated using (active or public.is_admin());
create policy "admin write songs" on public.songs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- playlists
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  shuffle boolean not null default false,
  repeat boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.playlists to anon, authenticated;
grant insert, update, delete on public.playlists to authenticated;
grant all on public.playlists to service_role;
alter table public.playlists enable row level security;
create policy "public read playlists" on public.playlists for select to anon, authenticated using (true);
create policy "admin write playlists" on public.playlists for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.station_settings add constraint settings_playlist_fk foreign key (active_playlist_id) references public.playlists(id) on delete set null;

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index playlist_items_pl_idx on public.playlist_items (playlist_id, position);
grant select on public.playlist_items to anon, authenticated;
grant insert, update, delete on public.playlist_items to authenticated;
grant all on public.playlist_items to service_role;
alter table public.playlist_items enable row level security;
create policy "public read items" on public.playlist_items for select to anon, authenticated using (true);
create policy "admin write items" on public.playlist_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- requests
create table public.song_requests (
  id uuid primary key default gen_random_uuid(),
  listener_name text not null check (char_length(listener_name) between 1 and 60),
  song_text text not null check (char_length(song_text) between 2 and 200),
  link text check (link is null or char_length(link) <= 500),
  note text check (note is null or char_length(note) <= 500),
  song_id uuid references public.songs(id) on delete set null,
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  youtube_title text,
  status request_status not null default 'pending',
  priority int not null default 0,
  created_at timestamptz not null default now(),
  played_at timestamptz,
  updated_at timestamptz not null default now()
);
create index song_requests_status_idx on public.song_requests (status, priority desc, created_at);
grant insert on public.song_requests to anon, authenticated;
grant select, update, delete on public.song_requests to authenticated;
grant all on public.song_requests to service_role;
alter table public.song_requests enable row level security;
create policy "anyone can request" on public.song_requests for insert to anon, authenticated
  with check (status = 'pending' and priority = 0 and played_at is null);
create policy "admin read requests" on public.song_requests for select to authenticated using (public.is_admin());
create policy "admin update requests" on public.song_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete requests" on public.song_requests for delete to authenticated using (public.is_admin());
create trigger t_req_upd before update on public.song_requests for each row execute function public.touch_updated_at();

create or replace function public.validate_song_request() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.station_settings; recent int;
begin
  select * into s from public.station_settings where id = 1;
  if not s.requests_enabled then raise exception 'Os pedidos de música estão desativados no momento.'; end if;
  if new.youtube_id is not null and not s.youtube_requests_enabled then raise exception 'Pedidos via YouTube estão desativados.'; end if;
  if new.link is not null and new.link !~* '^https?://' then raise exception 'Link inválido.'; end if;
  select count(*) into recent from public.song_requests
    where lower(listener_name) = lower(new.listener_name) and created_at > now() - interval '1 hour';
  if recent >= s.max_requests_per_hour then raise exception 'Limite de pedidos por hora atingido. Tente mais tarde.'; end if;
  if exists (select 1 from public.song_requests r where r.status in ('pending','approved','queued','playing')
      and (lower(r.song_text) = lower(new.song_text)
        or (new.song_id is not null and r.song_id = new.song_id)
        or (new.youtube_id is not null and r.youtube_id = new.youtube_id))) then
    raise exception 'Essa música já está na fila de pedidos.';
  end if;
  if new.song_id is not null then
    select coalesce(artist || ' - ', '') || title into new.song_text from public.songs where id = new.song_id;
  end if;
  return new;
end $$;
create trigger t_req_validate before insert on public.song_requests for each row execute function public.validate_song_request();

-- public queue with privacy (first name only, no notes/links)
create or replace function public.get_public_queue()
returns table (id uuid, listener text, song_text text, status request_status, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, split_part(r.listener_name, ' ', 1), r.song_text, r.status, r.created_at
  from public.song_requests r
  where r.status in ('pending','approved','queued','playing')
  order by case r.status when 'playing' then 0 when 'queued' then 1 when 'approved' then 2 else 3 end, r.priority desc, r.created_at
  limit 30
$$;
grant execute on function public.get_public_queue() to anon, authenticated;

-- presenters & schedule
create table public.presenters (
  id uuid primary key default gen_random_uuid(),
  name text not null, bio text, photo_url text,
  created_at timestamptz not null default now()
);
grant select on public.presenters to anon, authenticated;
grant insert, update, delete on public.presenters to authenticated;
grant all on public.presenters to service_role;
alter table public.presenters enable row level security;
create policy "public read presenters" on public.presenters for select to anon, authenticated using (true);
create policy "admin write presenters" on public.presenters for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null, end_time time not null,
  title text not null, description text,
  presenter_id uuid references public.presenters(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select on public.schedule_slots to anon, authenticated;
grant insert, update, delete on public.schedule_slots to authenticated;
grant all on public.schedule_slots to service_role;
alter table public.schedule_slots enable row level security;
create policy "public read schedule" on public.schedule_slots for select to anon, authenticated using (true);
create policy "admin write schedule" on public.schedule_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- banners
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, image_url text, link_url text,
  starts_at timestamptz, ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;
grant all on public.banners to service_role;
alter table public.banners enable row level security;
create policy "public read live banners" on public.banners for select to anon, authenticated
  using (public.is_admin() or (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())));
create policy "admin write banners" on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- messages (contact / advertising)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contato' check (kind in ('contato','divulgacao')),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 255),
  phone text check (phone is null or char_length(phone) <= 40),
  subject text check (subject is null or char_length(subject) <= 150),
  body text not null check (char_length(body) between 2 and 3000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant insert on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "anyone can send message" on public.messages for insert to anon, authenticated with check (read = false);
create policy "admin read messages" on public.messages for select to authenticated using (public.is_admin());
create policy "admin update messages" on public.messages for update to authenticated using (public.is_admin());
create policy "admin delete messages" on public.messages for delete to authenticated using (public.is_admin());

-- play logs
create table public.play_logs (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs(id) on delete set null,
  request_id uuid references public.song_requests(id) on delete set null,
  title text not null, artist text,
  source text not null check (source in ('library','request','youtube','live')),
  played_at timestamptz not null default now()
);
create index play_logs_at_idx on public.play_logs (played_at desc);
grant select, insert, delete on public.play_logs to authenticated;
grant all on public.play_logs to service_role;
alter table public.play_logs enable row level security;
create policy "admin read logs" on public.play_logs for select to authenticated using (public.is_admin());
create policy "admin insert logs" on public.play_logs for insert to authenticated with check (public.is_admin());
create policy "admin delete logs" on public.play_logs for delete to authenticated using (public.is_admin());

-- storage policies (buckets created separately)
create policy "public read media" on storage.objects for select to anon, authenticated using (bucket_id in ('audio','images'));
create policy "admin upload media" on storage.objects for insert to authenticated with check (bucket_id in ('audio','images') and public.is_admin());
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id in ('audio','images') and public.is_admin());
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id in ('audio','images') and public.is_admin());