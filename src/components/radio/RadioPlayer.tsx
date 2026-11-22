import { Mic2, Play, Pause, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { usePlayer, YT_CONTAINER_ID } from "@/lib/player";

export function RadioPlayer() {
  const p = usePlayer();
  const live = p.source !== "library";
  const active = p.isPlaying || p.loading || p.dj.state === "speaking";
  return (
    <section aria-label="Player da rádio" className="mb-8 border-y border-border py-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          size="icon"
          variant="neon"
          aria-label={active ? "Pausar" : "Reproduzir"}
          title={active ? "Pausar" : "Reproduzir"}
          onClick={active ? p.pause : p.play}
        >
          {active ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-0 flex-1 basis-40">
          <p className="break-words font-semibold">{p.current?.title ?? "Sintonia Radio Viva"}</p>
          <p className="break-words text-sm text-muted-foreground">
            {p.current?.artist ??
              (live
                ? "Transmissão ao vivo"
                : p.libraryEmpty
                  ? "Biblioteca vazia"
                  : "Programação musical")}
          </p>
          <p aria-live="polite" className="text-xs text-neon-cyan">
            {p.dj.state === "speaking"
              ? "DJ IA no microfone"
              : p.loading
                ? "Preparando áudio…"
                : p.isPlaying
                  ? "Tocando"
                  : "Pausado"}
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          aria-label="Próxima faixa"
          title="Próxima faixa"
          disabled={live || (p.libraryEmpty && !p.current)}
          onClick={p.skip}
        >
          <SkipForward />
        </Button>
        <div className="flex w-32 items-center gap-3">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          <Slider
            aria-label="Volume da música"
            min={0}
            max={1}
            step={0.05}
            value={[p.volume]}
            onValueChange={([v]) => {
              if (v !== undefined) p.setVolume(v);
            }}
          />
        </div>
      </div>
      {p.blocked && (
        <p role="status" className="mt-3 text-sm text-warning">
          {p.blocked}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-border pt-5">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Mic2 className="size-4 text-neon-cyan" />
          DJ IA
          <Switch
            aria-label="Ativar DJ IA"
            checked={p.dj.preferences.enabled}
            disabled={!p.dj.supported}
            onCheckedChange={(v) => p.dj.update({ enabled: v })}
          />
        </label>
        <label className="flex w-full max-w-64 items-center gap-3 text-sm">
          <span className="shrink-0">Velocidade</span>
          <Slider
            aria-label="Velocidade da fala"
            min={0.8}
            max={1.3}
            step={0.05}
            value={[p.dj.preferences.rate]}
            disabled={!p.dj.supported}
            onValueChange={([v]) => {
              if (v !== undefined) p.dj.update({ rate: v });
            }}
          />
          <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
            {p.dj.preferences.rate.toFixed(2)}×
          </span>
        </label>
        <details className="w-full text-sm">
          <summary className="cursor-pointer text-muted-foreground">Voz</summary>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex w-full max-w-64 items-center gap-3">
              <span>Tom</span>
              <Slider
                aria-label="Tom da voz"
                min={0.8}
                max={1.2}
                step={0.05}
                value={[p.dj.preferences.pitch]}
                onValueChange={([v]) => {
                  if (v !== undefined) p.dj.update({ pitch: v });
                }}
              />
              <span className="w-10 shrink-0 tabular-nums">
                {p.dj.preferences.pitch.toFixed(2)}
              </span>
            </label>
            <label className="flex w-full max-w-64 items-center gap-3">
              <span>Volume</span>
              <Slider
                aria-label="Volume da voz"
                min={0}
                max={1}
                step={0.05}
                value={[p.dj.preferences.volume]}
                onValueChange={([v]) => {
                  if (v !== undefined) p.dj.update({ volume: v });
                }}
              />
              <span className="w-10 shrink-0 tabular-nums">
                {Math.round(p.dj.preferences.volume * 100)}%
              </span>
            </label>
          </div>
        </details>
      </div>
      {!p.dj.supported && (
        <p className="mt-3 text-sm text-muted-foreground">Voz indisponível neste navegador.</p>
      )}
      {live && (
        <p className="mt-3 text-sm text-muted-foreground">
          DJ IA suspenso durante a transmissão ao vivo.
        </p>
      )}
      <div
        className={p.current?.kind === "youtube" ? "mt-4 aspect-video w-full max-w-md" : "hidden"}
      >
        <div id={YT_CONTAINER_ID} />
      </div>
    </section>
  );
}