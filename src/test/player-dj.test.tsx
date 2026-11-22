import { act, cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerProvider, usePlayer } from "@/lib/player";
import { DJ_STORAGE_KEY } from "@/lib/dj";

const data = vi.hoisted(() => ({
  settings: {
    mode: "library",
    name: "Sintonia Radio Viva",
    live_program_active: false,
    stream_url: "https://example.test/live",
    active_playlist_id: null,
    youtube_requests_enabled: true,
  },
  queue: [] as {
    id: string;
    status: string;
    song_id: string | null;
    youtube_id: string | null;
    song_text: string;
    listener: string;
  }[],
  songs: [
    { id: "s1", title: "O Sol", artist: "Vitor Kley", cover_url: null, file_path: "sol.mp3" },
    { id: "s2", title: "Tempo", artist: null, cover_url: null, file_path: "tempo.mp3" },
  ],
  updates: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useIsAdmin: () => ({ isAdmin: true }) }));
vi.mock("@/lib/queries", () => ({
  settingsQuery: { queryKey: ["settings"], queryFn: async () => ({ ...data.settings }) },
}));
vi.mock("@/lib/media", () => ({
  resolveMedia: vi.fn(async (ref: string) => (ref ? `https://example.test/${ref}` : null)),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      let id: string | undefined;
      const chain = {
        select: () => chain,
        eq: (_key: string, value: string) => {
          id = value;
          return chain;
        },
        order: () => chain,
        limit: async () => ({ data: table === "songs" ? data.songs : [] }),
        maybeSingle: async () => ({ data: data.songs.find((s) => s.id === id) }),
        update: (value: unknown) => {
          data.updates(value);
          return chain;
        },
        insert: vi.fn(async () => ({ error: null })),
      };
      return chain;
    },
    rpc: async () => ({ data: data.queue }),
    channel: () => {
      const c = { on: () => c, subscribe: () => c, track: vi.fn(), presenceState: () => ({}) };
      return c;
    },
    removeChannel: vi.fn(),
  },
}));

let player: ReturnType<typeof usePlayer> | undefined;
let audio: FakeAudio;
let utterances: SpeechSynthesisUtterance[];
class FakeAudio extends EventTarget {
  src = "";
  paused = true;
  volume = 0.8;
  muted = false;
  preload = "";
  crossOrigin: string | null = null;
  currentTime = 0;
  duration = 60;
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
  });
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
  getAttribute() {
    return this.src || null;
  }
  removeAttribute() {
    this.src = "";
  }
  load() {}
  canPlayType() {
    return "";
  }
}
function Probe() {
  player = usePlayer();
  return null;
}
async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <PlayerProvider>
        <Probe />
      </PlayerProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(player?.current?.songId).toBe("s1"));
  return { ...view, client };
}
async function finishVoice() {
  const u = utterances.at(-1);
  if (!u) throw new Error("No voice");
  await act(async () => {
    u.onstart?.({} as SpeechSynthesisEvent);
    u.onend?.({} as SpeechSynthesisEvent);
    await new Promise((resolve) => setTimeout(resolve, 280));
  });
}
beforeEach(() => {
  localStorage.clear();
  player = undefined;
  utterances = [];
  data.queue = [];
  data.settings.mode = "library";
  data.updates.mockClear();
  vi.stubGlobal(
    "Audio",
    class {
      constructor() {
        audio = new FakeAudio();
        return audio;
      }
    },
  );
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  vi.stubGlobal("speechSynthesis", {
    speak: (u: SpeechSynthesisUtterance) => utterances.push(u),
    cancel: vi.fn(),
    getVoices: () => [],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DJ player integration", () => {
  it("starts the library only after speech, and advances without music overlap", async () => {
    await mount();
    act(() => player?.play());
    await waitFor(() => expect(utterances).toHaveLength(1));
    expect(audio.play).not.toHaveBeenCalled();
    await finishVoice();
    expect(audio.play).toHaveBeenCalledTimes(1);
    act(() => audio.dispatchEvent(new Event("ended")));
    await waitFor(() => expect(utterances).toHaveLength(2));
    expect(audio.paused).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(utterances[1]?.text).toContain("Tempo");
    await finishVoice();
    expect(audio.play).toHaveBeenCalledTimes(2);
  });
  it("prioritizes named requests and preserves playing/done statuses", async () => {
    await mount();
    act(() => player?.dj.update({ enabled: false }));
    act(() => player?.play());
    await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
    data.queue = [
      {
        id: "r1",
        status: "queued",
        song_id: "s2",
        youtube_id: null,
        song_text: "Tempo",
        listener: "Ana",
      },
    ];
    act(() => {
      player?.dj.update({ enabled: true });
      audio.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => expect(utterances).toHaveLength(1));
    expect(utterances[0]?.text).toContain("Ana");
    expect(player?.current?.listener).toBe("Ana");
    expect(data.updates).not.toHaveBeenCalled();
    await finishVoice();
    expect(data.updates).toHaveBeenCalledWith({ status: "playing" });
    act(() => audio.dispatchEvent(new Event("ended")));
    await waitFor(() =>
      expect(data.updates).toHaveBeenCalledWith(expect.objectContaining({ status: "done" })),
    );
  });
  it("honors the locally disabled DJ", async () => {
    localStorage.setItem(DJ_STORAGE_KEY, JSON.stringify({ enabled: false, rate: 1.15 }));
    await mount();
    act(() => player?.play());
    await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
    expect(utterances).toHaveLength(0);
    expect(player?.dj.preferences.rate).toBe(1.15);
  });
  it("pausing cancels speech and stale completion cannot start a track", async () => {
    await mount();
    act(() => player?.play());
    await waitFor(() => expect(utterances).toHaveLength(1));
    const end = utterances[0]?.onend;
    act(() => player?.pause());
    await act(async () => {
      end?.call(utterances[0] as SpeechSynthesisUtterance, {} as SpeechSynthesisEvent);
      await new Promise((resolve) => setTimeout(resolve, 280));
    });
    expect(audio.play).not.toHaveBeenCalled();
  });
  it("switching to live cancels speech and never announces the stream", async () => {
    const { client } = await mount();
    act(() => player?.play());
    await waitFor(() => expect(utterances).toHaveLength(1));
    act(() => {
      data.settings.mode = "live";
      client.setQueryData(["settings"], { ...data.settings });
    });
    await waitFor(() => expect(audio.src).toBe("https://example.test/live"));
    expect(utterances).toHaveLength(1);
    expect(player?.source).toBe("live");
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("skipping during speech cannot release an outdated track", async () => {
    await mount();
    act(() => player?.play());
    await waitFor(() => expect(utterances).toHaveLength(1));
    act(() => player?.skip());
    await waitFor(() => expect(utterances).toHaveLength(2));
    expect(audio.play).not.toHaveBeenCalled();
    await finishVoice();
    expect(audio.src).toContain("tempo.mp3");
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("disabling DJ during speech releases the prepared track without overlap", async () => {
    await mount();
    act(() => player?.play());
    await waitFor(() => expect(utterances).toHaveLength(1));
    act(() => player?.dj.update({ enabled: false }));
    await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
    expect(player?.dj.preferences.enabled).toBe(false);
  });
  it("unmounting cancels a waiting track", async () => {
    const view = await mount();
    act(() => player?.play());
    await waitFor(() => expect(utterances).toHaveLength(1));
    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 280));
    expect(audio.play).not.toHaveBeenCalled();
  });
  it("continues music without speech when the browser has no voice support", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    // Feature detection uses property presence, just like actual unsupported browsers.
    delete (window as unknown as Record<string, unknown>)["speechSynthesis"];
    await mount();
    act(() => player?.play());
    await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
    expect(player?.dj.supported).toBe(false);
    expect(utterances).toHaveLength(0);
  });
});