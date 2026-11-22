import { afterEach, describe, expect, it, vi } from "vitest";
import { announcement, BrowserDJ, DJ_DEFAULTS, readDJPreferences } from "@/lib/dj";

afterEach(() => vi.useRealTimers());

describe("DJ announcements", () => {
  it("announces a library track with its real artist and varies successive calls", () => {
    const track = { title: "O Sol", artist: "Vitor Kley" };
    expect(announcement(track, 0)).toContain("O Sol, com Vitor Kley");
    expect(announcement(track, 1)).not.toBe(announcement(track, 0));
  });
  it("thanks the listener separately from the artist", () => {
    const text = announcement(
      { title: "O Sol", artist: "Vitor Kley", requestId: "r1", listener: "Ana" },
      0,
    );
    expect(text).toContain("Obrigado pelo pedido, Ana");
    expect(text).toContain("O Sol, com Vitor Kley");
  });
  it("does not invent absent artist or listener", () => {
    const text = announcement({ title: "O Sol", artist: null, requestId: "r1" }, 0);
    expect(text).toContain("Obrigado por participar");
    expect(text).not.toMatch(/com |undefined|null|Pedido de/);
  });
  it("validates local preferences and natural defaults", () => {
    expect(readDJPreferences(null)).toEqual({ enabled: true, rate: 1, pitch: 1, volume: 0.85 });
    expect(readDJPreferences({ enabled: false, rate: 4, pitch: 0, volume: -1 })).toEqual({
      enabled: false,
      rate: 1.3,
      pitch: 0.8,
      volume: 0,
    });
  });
});

describe("Browser speech lifecycle", () => {
  function setup() {
    const spoken: SpeechSynthesisUtterance[] = [];
    const voice = { lang: "pt-BR", name: "Português" } as SpeechSynthesisVoice;
    const speech = {
      cancel: vi.fn(),
      speak: vi.fn((u: SpeechSynthesisUtterance) => spoken.push(u)),
      getVoices: () => [{ lang: "en-US" }, voice],
    } as unknown as SpeechSynthesis;
    const state = vi.fn();
    const dj = new BrowserDJ(speech, (text) => ({ text }) as SpeechSynthesisUtterance, state);
    return { dj, spoken, speech, voice, state };
  }
  it("does not speak when disabled", async () => {
    const { dj, speech } = setup();
    expect(await dj.speak("Teste", { ...DJ_DEFAULTS, enabled: false })).toBe(true);
    expect(speech.speak).not.toHaveBeenCalled();
  });
  it("selects pt-BR and waits until voice ends plus 250ms", async () => {
    vi.useFakeTimers();
    const { dj, spoken, voice } = setup();
    const done = vi.fn();
    const promise = dj.speak("Teste", DJ_DEFAULTS).then(done);
    const u = spoken[0];
    if (!u) throw new Error("No utterance");
    expect(u.lang).toBe("pt-BR");
    expect(u.voice).toBe(voice);
    expect(u.rate).toBe(1);
    u.onstart?.({} as SpeechSynthesisEvent);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).not.toHaveBeenCalled();
    u.onend?.({} as SpeechSynthesisEvent);
    await vi.advanceTimersByTimeAsync(249);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(done).toHaveBeenCalledWith(true);
  });
  it("cancels old callbacks and releases concurrent callers safely", async () => {
    vi.useFakeTimers();
    const { dj, spoken } = setup();
    const first = dj.speak("Primeira", DJ_DEFAULTS);
    const oldEnd = spoken[0]?.onend;
    const second = dj.speak("Segunda", DJ_DEFAULTS);
    expect(await first).toBe(false);
    oldEnd?.call(spoken[0] as SpeechSynthesisUtterance, {} as SpeechSynthesisEvent);
    dj.cancel();
    expect(await second).toBe(false);
    await vi.runAllTimersAsync();
  });
  it("reports gesture blocking without hanging the transition", async () => {
    vi.useFakeTimers();
    const { dj, state } = setup();
    const result = dj.speak("Teste", DJ_DEFAULTS);
    await vi.advanceTimersByTimeAsync(3500);
    expect(await result).toBe(false);
    expect(state).toHaveBeenCalledWith("blocked");
  });
});