drop function public.get_public_queue();
create function public.get_public_queue()
returns table (id uuid, listener text, song_text text, status request_status, created_at timestamptz, song_id uuid, youtube_id text, priority int)
language sql stable security definer set search_path = public as $$
  select r.id, split_part(r.listener_name, ' ', 1), r.song_text, r.status, r.created_at, r.song_id, r.youtube_id, r.priority
  from public.song_requests r
  where r.status in ('pending','approved','queued','playing')
  order by case r.status when 'playing' then 0 when 'queued' then 1 when 'approved' then 2 else 3 end, r.priority desc, r.created_at
  limit 30
$$;
grant execute on function public.get_public_queue() to anon, authenticated;