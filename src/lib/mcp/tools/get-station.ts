import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_station", title: "Consultar a rádio",
  description: "Consulta o nome, slogan, modo de reprodução e disponibilidade de pedidos da rádio.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const db = await supabaseForUser(ctx);
    const { data, error } = await db.from("station_settings").select("name,slogan,mode,live_program_active,live_program_title,requests_enabled,request_rules").eq("id", 1).abortSignal(ctx.signal).single();
    if (error) throw new ToolError("Não foi possível consultar a rádio.");
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { station: data } };
  },
});