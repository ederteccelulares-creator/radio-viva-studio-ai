import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_schedule", title: "Consultar programação",
  description: "Lista até 100 programas da rádio, opcionalmente por dia da semana (0 domingo a 6 sábado).",
  inputSchema: { day: z.number().int().min(0).max(6).optional().describe("Dia da semana: 0 domingo a 6 sábado; omita para todos.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ day }, ctx) => {
    const db = await supabaseForUser(ctx);
    let query = db.from("schedule_slots").select("id,title,description,day_of_week,start_time,end_time,presenter:presenters(name)").order("day_of_week").order("start_time").limit(100);
    if (day !== undefined) query = query.eq("day_of_week", day);
    const { data, error } = await query.abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar a programação.");
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }], structuredContent: { programs: data ?? [] } };
  },
});