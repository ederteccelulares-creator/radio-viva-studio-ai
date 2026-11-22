import type { Database } from "@/integrations/supabase/types";
type T = Database["public"]["Tables"];
export type Settings = T["station_settings"]["Row"];
export type Song = T["songs"]["Row"];
export type Genre = T["genres"]["Row"];
export type Playlist = T["playlists"]["Row"];
export type PlaylistItem = T["playlist_items"]["Row"];
export type SongRequest = T["song_requests"]["Row"];
export type Presenter = T["presenters"]["Row"];
export type ScheduleSlot = T["schedule_slots"]["Row"];
export type Banner = T["banners"]["Row"];
export type Message = T["messages"]["Row"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type PublicQueueItem = Database["public"]["Functions"]["get_public_queue"]["Returns"][number];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  queued: "Na fila",
  playing: "Tocando",
  done: "Concluído",
  rejected: "Recusado",
};
export const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Ocorreu um erro inesperado.";
}