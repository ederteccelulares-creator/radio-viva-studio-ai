import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWebMCP } from "use-webmcp-tool";
import { Radio, CalendarDays, ListMusic, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsQuery, scheduleQuery, publicQueueQuery } from "@/lib/queries";
import { DAYS, STATUS_LABEL } from "@/lib/db";
import { useUser } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { RadioPlayer } from "@/components/radio/RadioPlayer";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Rádio Online Pro · Sintonia Radio Viva",
      "Informações da rádio, programação e fila pública de músicas.",
    ),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(scheduleQuery),
      context.queryClient.ensureQueryData(publicQueueQuery),
    ]);
  },
  component: Index,
});

function Index() {
  const { data: station } = useSuspenseQuery(settingsQuery);
  const { data: schedule } = useSuspenseQuery(scheduleQuery);
  const { data: queue } = useSuspenseQuery(publicQueueQuery);
  const { user } = useUser();
  const [day, setDay] = useState<number | null>(null);
  const visible = schedule.filter((slot) => day === null || slot.day_of_week === day);
  function filterSchedule(value: unknown) {
    if (
      value !== null &&
      (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 6)
    )
      throw new Error("Dia inválido; use 0 a 6 ou null para todos.");
    setDay(value);
  }
  useWebMCP({
    name: "read_radio_screen",
    description:
      "Consulta informações da rádio, programas atualmente exibidos e a fila pública desta tela.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () =>
      runWebMCPTool("read_radio_screen", () =>
        [
          `${station.name}: ${station.slogan ?? ""}. ${station.live_program_active ? "Ao vivo" : "Programação musical"}.`,
          "Programação: " +
            (visible.length
              ? visible
                  .map(
                    (s) =>
                      `${s.id}: ${DAYS[s.day_of_week]} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} ${s.title}`,
                  )
                  .join("; ")
              : "Nenhum programa neste dia."),
          "Fila: " +
            (queue.length
              ? queue.map((q) => `${q.id}: ${q.song_text} (${STATUS_LABEL[q.status]})`).join("; ")
              : "Nenhuma música na fila."),
        ].join("\n"),
      ),
  });
  useWebMCP({
    name: "filter_schedule",
    description: "Altera o dia da programação exibida na rádio; use null para mostrar todos.",
    inputSchema: {
      type: "object",
      properties: {
        day: {
          type: ["integer", "null"],
          minimum: 0,
          maximum: 6,
          description: "0 domingo a 6 sábado; null para todos.",
        },
      },
      required: ["day"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: ({ day }: { day: unknown }) =>
      runWebMCPTool("filter_schedule", () => {
        filterSchedule(day);
        return "Programação filtrada.";
      }),
  });
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <header className="mb-14 flex items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <Radio className="size-7 shrink-0 text-neon-cyan" />
          <span className="text-sm font-semibold">Sintonia Radio Viva</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/login">
            <LogIn />
            {user ? "Minha conta" : "Entrar"}
          </a>
        </Button>
      </header>
      <section className="pb-12">
        <p className="mb-4 flex items-center gap-2 text-sm text-neon-cyan">
          <Radio className="size-4" />
          {station.live_program_active ? "AO VIVO" : "RÁDIO ONLINE"}
        </p>
        <h1 className="mb-5 break-words text-3xl font-semibold md:text-5xl">{station.name}</h1>
        <p className="max-w-xl text-lg text-muted-foreground">{station.slogan}</p>
        {station.live_program_active && <p className="mt-4">{station.live_program_title}</p>}
      </section>
      <RadioPlayer />
      <section className="border-t border-border py-8">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
          <CalendarDays className="size-5 text-neon-cyan" />
          Programação
        </h2>
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Dia da programação">
          <Button
            size="sm"
            variant={day === null ? "default" : "secondary"}
            aria-pressed={day === null}
            onClick={() => filterSchedule(null)}
          >
            Todos
          </Button>
          {DAYS.map((label, i) => (
            <Button
              key={label}
              size="sm"
              variant={day === i ? "default" : "secondary"}
              aria-pressed={day === i}
              onClick={() => filterSchedule(i)}
            >
              {label}
            </Button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="py-8 text-muted-foreground">
            Nenhum programa cadastrado para este período.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((slot) => (
              <li key={slot.id} className="flex flex-wrap items-start gap-6 py-5">
                <div className="w-40 shrink-0 text-sm text-neon-cyan">
                  {DAYS[slot.day_of_week]}
                  <br />
                  {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-semibold">{slot.title}</h3>
                  <p className="text-sm text-muted-foreground">{slot.presenter?.name}</p>
                  {slot.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{slot.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="border-t border-border py-8">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
          <ListMusic className="size-5 text-neon-cyan" />
          Fila de músicas
        </h2>
        {queue.length === 0 ? (
          <p className="py-8 text-muted-foreground">Nenhuma música na fila no momento.</p>
        ) : (
          <ol className="divide-y divide-border">
            {queue.map((item, i) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <span className="text-neon-cyan">{i + 1}</span>
                <span className="min-w-0 flex-1 break-words">{item.song_text}</span>
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[item.status]}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        {station.name} · Sintonia Radio Viva
      </footer>
    </main>
  );
}