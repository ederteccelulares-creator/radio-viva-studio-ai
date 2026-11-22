import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("station_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
  staleTime: 15_000,
});

export const bannersQuery = queryOptions({
  queryKey: ["banners", "public"],
  queryFn: async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const scheduleQuery = queryOptions({
  queryKey: ["schedule"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("schedule_slots")
      .select("*, presenter:presenters(id,name,photo_url,bio)")
      .order("day_of_week")
      .order("start_time");
    if (error) throw error;
    return data;
  },
});

export const presentersQuery = queryOptions({
  queryKey: ["presenters"],
  queryFn: async () => {
    const { data, error } = await supabase.from("presenters").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const publicQueueQuery = queryOptions({
  queryKey: ["public-queue"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_public_queue");
    if (error) throw error;
    return data ?? [];
  },
  refetchInterval: 20_000,
});

export const genresQuery = queryOptions({
  queryKey: ["genres"],
  queryFn: async () => {
    const { data, error } = await supabase.from("genres").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const playlistsQuery = queryOptions({
  queryKey: ["playlists"],
  queryFn: async () => {
    const { data, error } = await supabase.from("playlists").select("*, playlist_items(count)").order("created_at");
    if (error) throw error;
    return data;
  },
});