import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { resolveMedia } from "@/lib/media";
import { useIsAdmin } from "@/lib/auth";
import type { Song } from "@/lib/db";
import { announcement, type DJPreferences, type DJState } from "@/lib/dj";
import { useDJ } from "@/lib/use-dj";

export type Track = {
  key: string;
  kind: "song" | "youtube" | "stream";
  title: string;
  artist: string | null;
  cover: string | null;
  songId?: string;
  fileRef?: string;
  youtubeId?: string;
  streamUrl?: string;
  requestId?: string;
  listener?: string;
};
export type Source = "library" | "live" | "program";

type Ctx = {
  dj: {
    preferences: DJPreferences;
    supported: boolean;
    state: DJState;
    update: (patch: Partial<DJPreferences>) => void;
  };
  source: Source;
  current: Track | null;
  next: Track | null;
  isPlaying: boolean;
  loading: boolean;
  volume: number;
  muted: boolean;
  position: number;
  duration: number;
  blocked: string | null;
  shuffle: boolean;
  repeat: boolean;
  listeners: number;
  liveMessage: string | null;
  libraryEmpty: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  skip: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (v: boolean) => void;
  playSongNow: (song: Song) => void;
};

const PlayerContext = createContext<Ctx | null>(null);
export function usePlayer() {
  const c = useContext(PlayerContext);
  if (!c) throw new Error("usePlayer fora do PlayerProvider");
  return c;
}

function songToTrack(
  s: Pick<Song, "id" | "title" | "artist" | "cover_url" | "file_path">,
  requestId?: string,
): Track {
  return {
    key: `${s.id}-${requestId ?? Math.random().toString(36).slice(2)}`,
    kind: "song",
    title: s.title,
    artist: s.artist,
    cover: s.cover_url,
    songId: s.id,
    fileRef: `audio:${s.file_path}`,
    ...(requestId ? { requestId } : {}),
  };
}

// ---- YouTube IFrame API loader ----
type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (v: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer;
      PlayerState: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
let ytPromise: Promise<void> | null = null;
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => resolve();
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytPromise;
}
export const YT_CONTAINER_ID = "yt-player-slot";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const dj = useDJ();
  const { cancel: cancelDJ, speak: speakDJ } = dj;
  const transitionId = useRef(0);
  const loadedTrackKey = useRef<string | null>(null);
  const variation = useRef(0);
  const transitioning = useRef(false);
  const { data: settings } = useQuery(settingsQuery);
  const { isAdmin } = useIsAdmin();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const playedRequests = useRef<Set<string>>(new Set());
  const libraryRef = useRef<Track[]>([]);
  const libIndex = useRef(0);
  const userStarted = useRef(false);

  const [current, setCurrent] = useState<Track | null>(null);
  const [next, setNext] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const [listeners, setListeners] = useState(0);
  const [libraryEmpty, setLibraryEmpty] = useState(false);

  const source: Source = settings?.live_program_active
    ? "program"
    : settings?.mode === "live"
      ? "live"
      : "library";
  const streamUrl =
    source === "program"
      ? settings?.live_program_url || settings?.stream_url
      : source === "live"
        ? settings?.stream_url
        : null;

  // Create audio element once (client only)
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.crossOrigin = null;
    audioRef.current = a;
    const onTime = () => {
      setPosition(a.currentTime);
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setLoading(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWait = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWait);
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
    ytRef.current?.setVolume(muted ? 0 : Math.round(volume * 100));
  }, [volume, muted]);

  // ---- Library loading ----
  const loadLibrary = useCallback(async () => {
    const plId = settings?.active_playlist_id;
    let rows: Pick<Song, "id" | "title" | "artist" | "cover_url" | "file_path">[] = [];
    if (plId) {
      const { data: pl } = await supabase
        .from("playlists")
        .select("shuffle,repeat")
        .eq("id", plId)
        .maybeSingle();
      if (pl) {
        setShuffle(pl.shuffle);
        setRepeat(pl.repeat);
      }
      const { data } = await supabase
        .from("playlist_items")
        .select("position, song:songs(id,title,artist,cover_url,file_path,active)")
        .eq("playlist_id", plId)
        .order("position")
        .limit(2000);
      rows = (data ?? [])
        .map((r) => r.song)
        .filter((s): s is NonNullable<typeof s> => !!s && s.active);
    }
    if (rows.length === 0) {
      const { data } = await supabase
        .from("songs")
        .select("id,title,artist,cover_url,file_path")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(500);
      rows = data ?? [];
    }
    libraryRef.current = rows.map((r) => songToTrack(r));
    libIndex.current = 0;
    setLibraryEmpty(rows.length === 0);
    return libraryRef.current;
  }, [settings?.active_playlist_id]);

  // ---- Request queue ----
  const fetchNextRequest = useCallback(async (): Promise<Track | null> => {
    const { data } = await supabase.rpc("get_public_queue");
    const item = (data ?? []).find(
      (r) =>
        (r.status === "queued" || r.status === "approved") &&
        (r.song_id || r.youtube_id) &&
        !playedRequests.current.has(r.id),
    );
    if (!item) return null;
    if (item.song_id) {
      const { data: s } = await supabase
        .from("songs")
        .select("id,title,artist,cover_url,file_path")
        .eq("id", item.song_id)
        .maybeSingle();
      if (!s) return null;
      return { ...songToTrack(s, item.id), listener: item.listener };
    }
    if (item.youtube_id && settings?.youtube_requests_enabled !== false) {
      return {
        key: `yt-${item.id}`,
        kind: "youtube",
        title: item.song_text,
        artist: null,
        listener: item.listener,
        cover: `https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg`,
        youtubeId: item.youtube_id,
        requestId: item.id,
      };
    }
    return null;
  }, [settings?.youtube_requests_enabled]);

  const pickLibrary = useCallback(
    (advance: boolean): Track | null => {
      const lib = libraryRef.current;
      if (lib.length === 0) return null;
      if (shuffle) return lib[Math.floor(Math.random() * lib.length)] ?? null;
      if (advance) {
        libIndex.current += 1;
        if (libIndex.current >= lib.length) {
          if (!repeat) return null;
          libIndex.current = 0;
        }
      }
      return lib[libIndex.current] ?? null;
    },
    [shuffle, repeat],
  );

  const peekLibrary = useCallback((): Track | null => {
    const lib = libraryRef.current;
    if (lib.length === 0 || shuffle) return null;
    const i = libIndex.current + 1;
    if (i >= lib.length) return repeat ? (lib[0] ?? null) : null;
    return lib[i] ?? null;
  }, [shuffle, repeat]);

  const setStatus = useCallback(
    async (requestId: string, status: "playing" | "done" | "rejected") => {
      if (!isAdmin) return;
      await supabase
        .from("song_requests")
        .update({ status, ...(status === "done" ? { played_at: new Date().toISOString() } : {}) })
        .eq("id", requestId);
      qc.invalidateQueries({ queryKey: ["public-queue"] });
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    [isAdmin, qc],
  );

  const logPlay = useCallback(
    async (t: Track) => {
      if (!isAdmin || t.kind === "stream") return;
      await supabase.from("play_logs").insert({
        title: t.title,
        artist: t.artist,
        song_id: t.songId ?? null,
        request_id: t.requestId ?? null,
        source: t.kind === "youtube" ? "youtube" : t.requestId ? "request" : "library",
      });
    },
    [isAdmin],
  );

  const stopAll = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    hlsRef.current?.destroy();
    hlsRef.current = null;
    try {
      ytRef.current?.stopVideo();
    } catch {
      /* noop */
    }
  }, []);

  const handleBlocked = useCallback((e: unknown) => {
    setLoading(false);
    setIsPlaying(false);
    const name =
      e && typeof e === "object" && "name" in e ? String((e as { name: string }).name) : "";
    if (name === "NotAllowedError") {
      setBlocked("Seu navegador bloqueou a reprodução automática. Toque em Play para ouvir.");
    } else if (name !== "AbortError") {
      setBlocked("Não foi possível reproduzir este áudio agora.");
    }
  }, []);

  const startTrack = useCallback(
    async (t: Track | null, id = transitionId.current, preparedUrl?: string) => {
      if (id !== transitionId.current) return;
      stopAll();
      setCurrent(t);
      setPosition(0);
      setDuration(0);
      if (!t) {
        setIsPlaying(false);
        return;
      }
      setBlocked(null);
      setLoading(true);
      void logPlay(t);
      if (t.requestId) {
        playedRequests.current.add(t.requestId);
        void setStatus(t.requestId, "playing");
      }
      if (t.kind === "youtube" && t.youtubeId) {
        await loadYouTubeApi();
        if (id !== transitionId.current) return;
        const YT = window.YT;
        if (!YT) return;
        loadedTrackKey.current = t.key;
        if (!ytRef.current) {
          ytRef.current = new YT.Player(YT_CONTAINER_ID, {
            height: "100%",
            width: "100%",
            videoId: t.youtubeId,
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: (ev: { target: YTPlayer }) => {
                ev.target.setVolume(Math.round(volume * 100));
                if (
                  userStarted.current &&
                  currentRef.current?.kind === "youtube" &&
                  !transitioning.current
                )
                  ev.target.playVideo();
                else ev.target.pauseVideo();
              },
              onAutoplayBlocked: () => {
                setLoading(false);
                setIsPlaying(false);
                setBlocked("Toque em Play para liberar o áudio do YouTube.");
              },
              onStateChange: (ev: { data: number }) => {
                if (
                  currentRef.current?.kind !== "youtube" ||
                  transitioning.current ||
                  !userStarted.current
                )
                  return;
                if (ev.data === 1) {
                  setIsPlaying(true);
                  setLoading(false);
                } else if (ev.data === 2) setIsPlaying(false);
                else if (ev.data === 0) onEndedRef.current();
              },
              onError: () => {
                if (
                  currentRef.current?.kind !== "youtube" ||
                  transitioning.current ||
                  !userStarted.current
                )
                  return;
                toast.error(
                  "Este vídeo do YouTube não permite reprodução incorporada ou está indisponível. Pulando.",
                );
                if (currentRef.current?.requestId)
                  void setStatus(currentRef.current.requestId, "rejected");
                onEndedRef.current(true);
              },
            },
          });
        } else {
          ytRef.current.loadVideoById(t.youtubeId);
        }
        return;
      }
      const a = audioRef.current;
      if (!a) return;
      let url: string | null = null;
      if (t.kind === "stream") url = t.streamUrl ?? null;
      else url = preparedUrl ?? (await resolveMedia(t.fileRef));
      if (id !== transitionId.current) return;
      if (!url) {
        setLoading(false);
        setBlocked("Arquivo de áudio indisponível.");
        return;
      }
      const isHls = /\.m3u8(\?|$)/i.test(url);
      if (isHls && !a.canPlayType("application/vnd.apple.mpegurl")) {
        const { default: Hls } = await import("hls.js");
        if (Hls.isSupported()) {
          if (id !== transitionId.current) return;
          const hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(a);
          hlsRef.current = hls;
        }
      } else {
        a.src = url;
      }
      loadedTrackKey.current = t.key;
      a.play().catch(handleBlocked);
    },
    [stopAll, logPlay, setStatus, handleBlocked, volume],
  );

  const currentRef = useRef<Track | null>(null);
  currentRef.current = current;

  const cancelTransition = useCallback(() => {
    transitionId.current += 1;
    transitioning.current = false;
    cancelDJ();
    setLoading(false);
  }, [cancelDJ]);

  // Prepare media first, speak while both music engines are stopped, then start it.
  const beginTrack = useCallback(
    async (t: Track | null, id: number, announce = true) => {
      if (id !== transitionId.current) return;
      transitioning.current = true;
      setLoading(true);
      try {
        let url: string | null = null;
        if (t?.kind === "song") url = await resolveMedia(t.fileRef);
        if (t?.kind === "youtube") await loadYouTubeApi();
        if (id !== transitionId.current) return;
        setCurrent(t);
        currentRef.current = t;
        if (t?.kind === "song" && !url) {
          setBlocked("Arquivo de áudio indisponível.");
          return;
        }
        if (announce && t && t.kind !== "stream") {
          const allowed = await speakDJ(announcement(t, variation.current++));
          if (id !== transitionId.current) return;
          if (!allowed) {
            setBlocked(
              "Locução indisponível ou bloqueada. Toque em Play para tentar novamente ou desligue o DJ IA.",
            );
            return;
          }
        }
        transitioning.current = false;
        if (id === transitionId.current) await startTrack(t, id, url ?? undefined);
      } catch (error) {
        if (id === transitionId.current) handleBlocked(error);
      } finally {
        if (id === transitionId.current) {
          transitioning.current = false;
          setLoading(false);
        }
      }
    },
    [speakDJ, startTrack, handleBlocked],
  );

  const advance = useCallback(
    async (skipped = false) => {
      if (source !== "library") return;
      cancelTransition();
      stopAll();
      const id = transitionId.current;
      const prev = currentRef.current;
      if (prev?.requestId && !skipped) void setStatus(prev.requestId, "done");
      const req = await fetchNextRequest();
      if (id !== transitionId.current) return;
      if (req) return beginTrack(req, id);
      // came back from a request → resume playlist at the same index; otherwise advance
      const resume = prev?.requestId ? pickLibrary(false) : pickLibrary(true);
      return beginTrack(resume, id);
    },
    [source, fetchNextRequest, pickLibrary, beginTrack, setStatus, cancelTransition, stopAll],
  );
  const onEndedRef = useRef<(skipped?: boolean) => void>(() => {});
  onEndedRef.current = (skipped?: boolean) => void advance(skipped);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => onEndedRef.current();
    const onError = () => {
      if (currentRef.current?.kind === "stream") {
        setLoading(false);
        setIsPlaying(false);
        setBlocked("Não foi possível conectar à transmissão ao vivo. Verifique a URL do stream.");
      } else if (a.getAttribute("src")) {
        onEndedRef.current(true);
      }
    };
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  // Compute "next" display
  useEffect(() => {
    let alive = true;
    if (source !== "library") {
      setNext(null);
      return;
    }
    fetchNextRequest().then((r) => alive && setNext(r ?? peekLibrary()));
    return () => {
      alive = false;
    };
  }, [current, source, fetchNextRequest, peekLibrary]);

  // React to source changes (admin switches mode / live program)
  const lastSource = useRef<string>("");
  useEffect(() => {
    if (!settings) return;
    const sig = `${source}|${streamUrl ?? ""}|${settings.active_playlist_id ?? ""}`;
    if (sig === lastSource.current) return;
    lastSource.current = sig;
    cancelTransition();
    stopAll();
    const id = transitionId.current;
    const prepare = async () => {
      if (source === "library") {
        const lib = await loadLibrary();
        const first = (await fetchNextRequest()) ?? lib[0] ?? null;
        if (id !== transitionId.current) return;
        if (userStarted.current) await beginTrack(first, id);
        else setCurrent(first);
      } else {
        const t: Track = {
          key: `stream-${sig}`,
          kind: "stream",
          title:
            source === "program"
              ? settings.live_program_title || "Programa ao vivo"
              : settings.name,
          artist: source === "program" ? null : settings.slogan,
          cover: settings.logo_url,
          streamUrl: streamUrl ?? "",
        };
        if (!streamUrl) {
          stopAll();
          setCurrent(t);
          setBlocked(
            source === "program" ? null : "A URL da transmissão ao vivo ainda não foi configurada.",
          );
          return;
        }
        if (userStarted.current) await beginTrack(t, id, false);
        else setCurrent(t);
      }
    };
    void prepare().catch(handleBlocked);
  }, [
    settings,
    source,
    streamUrl,
    loadLibrary,
    fetchNextRequest,
    beginTrack,
    stopAll,
    cancelTransition,
    handleBlocked,
  ]);

  useEffect(
    () => () => {
      transitionId.current += 1;
      cancelDJ();
      ytRef.current?.destroy();
      hlsRef.current?.destroy();
    },
    [cancelDJ],
  );

  // Realtime: settings changes reach all listeners
  useEffect(() => {
    const ch = supabase
      .channel(`settings-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "station_settings" },
        () => {
          qc.invalidateQueries({ queryKey: ["settings"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  // Presence: listeners online
  useEffect(() => {
    const ch = supabase.channel("radio-listeners", {
      config: { presence: { key: crypto.randomUUID() } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, { playing?: boolean }[]>;
      setListeners(Object.values(state).filter((arr) => arr.some((p) => p.playing)).length);
    }).subscribe();
    const iv = setInterval(() => {
      void ch.track({ playing: !!audioRef.current && !audioRef.current.paused });
    }, 15000);
    return () => {
      clearInterval(iv);
      supabase.removeChannel(ch);
    };
  }, []);

  // Media Session (background / lock screen controls)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !current) return;
    let alive = true;
    resolveMedia(current.cover).then((art) => {
      if (!alive) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist ?? settings?.name ?? "",
        album: settings?.name ?? "",
        artwork: art ? [{ src: art, sizes: "512x512" }] : [],
      });
    });
    return () => {
      alive = false;
    };
  }, [current, settings?.name]);

  const play = useCallback(() => {
    if (transitioning.current) return;
    userStarted.current = true;
    cancelTransition();
    setBlocked(null);
    const t = currentRef.current;
    if (t?.kind === "youtube" && ytRef.current && loadedTrackKey.current === t.key) {
      ytRef.current?.playVideo();
      return;
    }
    const a = audioRef.current;
    if (a && a.getAttribute("src") && t?.kind !== "stream" && loadedTrackKey.current === t?.key) {
      a.play().catch(handleBlocked);
      return;
    }
    if (t?.kind === "stream" && !t.streamUrl) {
      setBlocked("A URL da transmissão ainda não foi configurada.");
      return;
    }
    void beginTrack(t ?? pickLibrary(false), transitionId.current);
  }, [beginTrack, pickLibrary, handleBlocked, cancelTransition]);

  const pause = useCallback(() => {
    userStarted.current = false;
    cancelTransition();
    if (currentRef.current?.kind === "youtube") ytRef.current?.pauseVideo();
    else if (currentRef.current?.kind === "stream") stopAll();
    else audioRef.current?.pause();
    setIsPlaying(false);
  }, [stopAll, cancelTransition]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      source === "library" ? () => onEndedRef.current(true) : null,
    );
  }, [play, pause, source]);

  const value = useMemo<Ctx>(
    () => ({
      dj: {
        preferences: dj.preferences,
        supported: dj.supported,
        state: dj.state,
        update: dj.update,
      },
      source,
      current,
      next,
      isPlaying,
      loading,
      volume,
      muted,
      position,
      duration,
      blocked,
      shuffle,
      repeat,
      listeners,
      liveMessage:
        source === "program" ? (settings?.live_message ?? "Estamos em programação ao vivo") : null,
      libraryEmpty,
      play,
      pause,
      toggle: () => (isPlaying ? pause() : play()),
      skip: () => {
        userStarted.current = true;
        onEndedRef.current(true);
      },
      setVolume: (v) => {
        setVolumeState(v);
        setMuted(false);
      },
      toggleMute: () => setMuted((m) => !m),
      setShuffle,
      setRepeat,
      playSongNow: (s) => {
        userStarted.current = true;
        cancelTransition();
        stopAll();
        void beginTrack(songToTrack(s), transitionId.current);
      },
    }),
    [
      source,
      current,
      next,
      isPlaying,
      loading,
      volume,
      muted,
      position,
      duration,
      blocked,
      shuffle,
      repeat,
      listeners,
      settings?.live_message,
      libraryEmpty,
      play,
      pause,
      beginTrack,
      cancelTransition,
      stopAll,
      dj.preferences,
      dj.supported,
      dj.state,
      dj.update,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}