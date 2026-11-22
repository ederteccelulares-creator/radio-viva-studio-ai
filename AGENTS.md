<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Agent integrations
- Keep remote MCP tools in `src/lib/mcp/` behind OAuth client-claim verification and caller-scoped RLS clients; generated routes belong to the SDK plugin so transport and identity stay consistent.
- Keep browser tools in the components rendering their data, wrapping execution with the shared telemetry helper; browser-local state must never become server data silently.
- Validate OAuth return paths once at the login boundary and preserve them through authentication; this prevents open redirects and losing consent requests.

## Radio playback
- Keep one PlayerProvider in the root and browser-local DJ preferences in useDJ; navigation must not restart music or persist listener settings to the server.
- Prepare tracks before BrowserDJ speech and guard every asynchronous transition with the player generation token; pause, skip and source changes must invalidate old callbacks before audio can start.