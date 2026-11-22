import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserDJ,
  DJ_DEFAULTS,
  DJ_STORAGE_KEY,
  readDJPreferences,
  type DJPreferences,
  type DJState,
} from "@/lib/dj";

export function useDJ() {
  const [preferences, setPreferences] = useState(DJ_DEFAULTS);
  const preferencesRef = useRef(preferences);
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<DJState>("idle");
  const engine = useRef<BrowserDJ | null>(null);
  useEffect(() => {
    try {
      const saved = readDJPreferences(JSON.parse(localStorage.getItem(DJ_STORAGE_KEY) ?? "null"));
      preferencesRef.current = saved;
      setPreferences(saved);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setState("unavailable");
      return;
    }
    setSupported(true);
    const speech = window.speechSynthesis;
    engine.current = new BrowserDJ(speech, (text) => new SpeechSynthesisUtterance(text), setState);
    const loadVoices = () => {
      speech.getVoices();
    };
    loadVoices();
    speech.addEventListener("voiceschanged", loadVoices);
    return () => {
      speech.removeEventListener("voiceschanged", loadVoices);
      engine.current?.cancel();
      engine.current = null;
    };
  }, []);
  const update = useCallback((patch: Partial<DJPreferences>) => {
    const value = readDJPreferences({ ...preferencesRef.current, ...patch });
    preferencesRef.current = value;
    setPreferences(value);
    try {
      localStorage.setItem(DJ_STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* Keep session preference. */
    }
    if (!value.enabled) engine.current?.cancel();
  }, []);
  const cancel = useCallback(() => engine.current?.cancel(), []);
  const speak = useCallback(async (text: string) => {
    if (!preferencesRef.current.enabled || !engine.current) return true;
    const result = await engine.current.speak(text, preferencesRef.current);
    // Disabling the DJ releases the waiting track; pause/skip are guarded by the player.
    return result || !preferencesRef.current.enabled;
  }, []);
  return { preferences, supported, state, update, speak, cancel };
}