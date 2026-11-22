export type DJPreferences = { enabled: boolean; rate: number; pitch: number; volume: number };
export const DJ_DEFAULTS: DJPreferences = { enabled: true, rate: 1, pitch: 1, volume: 0.85 };
export const DJ_STORAGE_KEY = "sintonia-radio-viva:dj:v1";

export function readDJPreferences(value: unknown): DJPreferences {
  const p = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const number = (key: string, fallback: number, min: number, max: number) =>
    typeof p[key] === "number" && Number.isFinite(p[key])
      ? Math.max(min, Math.min(max, p[key]))
      : fallback;
  return {
    enabled: typeof p["enabled"] === "boolean" ? p["enabled"] : DJ_DEFAULTS.enabled,
    rate: number("rate", 1, 0.8, 1.3),
    pitch: number("pitch", 1, 0.8, 1.2),
    volume: number("volume", 0.85, 0, 1),
  };
}

type AnnouncementTrack = {
  title: string;
  artist: string | null;
  requestId?: string;
  listener?: string;
};
export function announcement(track: AnnouncementTrack, variation: number): string {
  const title = track.title.trim();
  const artist = track.artist?.trim();
  const music = title
    ? `${title}${artist ? `, com ${artist}` : ""}`
    : artist
      ? `música de ${artist}`
      : "mais música";
  const listener = track.listener?.trim();
  if (track.requestId) {
    const thanks = listener ? `Obrigado pelo pedido, ${listener}!` : "Obrigado por participar!";
    const options = [
      `${thanks} Agora, ${music}, na Sintonia Radio Viva.`,
      `Pedido especial${listener ? ` de ${listener}` : ""}: ${music}. Valeu pela companhia!`,
      `Vamos atender ${listener ? `ao pedido de ${listener}` : "mais um pedido"}: ${music}. Obrigado por estar com a Sintonia Radio Viva!`,
    ];
    return options[variation % options.length] ?? options[0] ?? "";
  }
  const options = [
    `Agora, ${music}, na Sintonia Radio Viva.`,
    `Na sequência, ${music}. Boa música pra você!`,
    `Seguimos com ${music}, aqui na Sintonia Radio Viva.`,
  ];
  return options[variation % options.length] ?? options[0] ?? "";
}

export type DJState = "idle" | "speaking" | "blocked" | "unavailable";

// Each cancellation settles the waiting transition and detaches old callbacks.
export class BrowserDJ {
  private cleanup: (() => void) | null = null;
  constructor(
    private speech: SpeechSynthesis,
    private utterance: (text: string) => SpeechSynthesisUtterance,
    private state: (state: DJState) => void,
  ) {}

  cancel() {
    this.cleanup?.();
    this.cleanup = null;
    this.speech.cancel();
  }

  speak(text: string, preferences: DJPreferences): Promise<boolean> {
    this.cancel();
    if (!preferences.enabled) return Promise.resolve(true);
    return new Promise((resolve) => {
      const u = this.utterance(text);
      u.lang = "pt-BR";
      u.voice = this.speech.getVoices().find((v) => /^pt[-_]BR$/i.test(v.lang)) ?? null;
      u.rate = preferences.rate;
      u.pitch = preferences.pitch;
      u.volume = preferences.volume;
      let finished = false;
      let started = false;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (success: boolean, state: DJState = "idle") => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        u.onend = null;
        u.onerror = null;
        u.onstart = null;
        this.cleanup = null;
        this.state(state);
        resolve(success);
      };
      this.cleanup = () => finish(false);
      // A missing onstart usually means gesture/autoplay restrictions.
      timer = setTimeout(() => {
        finish(false, "blocked");
        this.speech.cancel();
      }, 3500);
      u.onstart = () => {
        started = true;
        this.state("speaking");
        clearTimeout(timer);
        timer = setTimeout(() => {
          finish(false, "blocked");
          this.speech.cancel();
        }, 30000);
      };
      u.onend = () => {
        clearTimeout(timer);
        // Keep a short gap after the voice, without releasing the transition early.
        timer = setTimeout(() => finish(true), 250);
      };
      u.onerror = (event) =>
        finish(false, event.error === "not-allowed" || !started ? "blocked" : "unavailable");
      try {
        this.speech.speak(u);
      } catch {
        finish(false, "unavailable");
      }
    });
  }
}