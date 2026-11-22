import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "radio-dj-ia-api" }));

app.get("/api/youtube/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const key = process.env.YOUTUBE_API_KEY;
  if (!query) return res.status(400).json({ error: "Informe o nome da música ou artista." });
  if (!key) return res.status(503).json({ error: "A busca do YouTube ainda não foi configurada no servidor." });

  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoCategoryId: "10",
      maxResults: "8",
      q: query,
      key
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await response.json() as {
      error?: { message?: string };
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } } }>;
    };
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Erro na API do YouTube." });

    const items = (data.items || []).flatMap(item => {
      const id = item.id?.videoId;
      if (!id) return [];
      return [{
        id,
        title: item.snippet?.title || "Vídeo sem título",
        channelTitle: item.snippet?.channelTitle || "YouTube",
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ""
      }];
    });
    return res.json({ items });
  } catch {
    return res.status(502).json({ error: "Não foi possível conectar ao YouTube." });
  }
});

app.listen(port, () => console.log(`Radio DJ IA API listening on :${port}`));
