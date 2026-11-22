import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_queue", title: "Consultar fila pública",
  description: "Lista até 50 pedidos da fila pública, sem notas privadas nem nomes completos dos ouvintes.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const db = await supabaseForUser(ctx);
    const { data, error } = await db.rpc("get_public_queue").limit(50).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar a fila.");
    const rows = (data ?? []).map(({ id, song_text, status }) => ({ id, song: song_text, status }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { queue: rows } };
  },
});