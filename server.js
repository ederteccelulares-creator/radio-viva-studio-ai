import 'dotenv/config'
import { rateLimit } from 'express-rate-limit'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 3001)
const apiKey = process.env.YOUTUBE_API_KEY
const cache = new Map()
const cacheTtl = 5 * 60 * 1000
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const youtubeSearchLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })
app.get('/api/health', (_req, res) => res.json({ ok: true, youtubeConfigured: Boolean(apiKey) }))
app.get('/api/youtube/search', youtubeSearchLimit, async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120)
  if (q.length < 2) return res.status(400).json({ error: 'Digite pelo menos 2 caracteres.' })
  if (!apiKey) return res.status(503).json({ error: 'API do YouTube ainda não configurada. Adicione YOUTUBE_API_KEY no ambiente do servidor.' })
  const cacheKey = q.toLocaleLowerCase('pt-BR')
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return res.json(cached.data)
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.search = new URLSearchParams({ part: 'snippet', q, type: 'video', videoEmbeddable: 'true', maxResults: '8', regionCode: 'BR', relevanceLanguage: 'pt', safeSearch: 'moderate', key: apiKey }).toString()
    const response = await fetch(url)
    const payload = await response.json()
    if (!response.ok) {
      const reason = payload?.error?.errors?.[0]?.reason
      const message = reason === 'quotaExceeded' ? 'A cota diária de pesquisa do YouTube foi atingida.' : 'O YouTube recusou a pesquisa. Verifique a chave e a API ativada.'
      return res.status(response.status).json({ error: message })
    }
    const items = (payload.items || []).filter(item => item.id?.videoId).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet?.title || 'Vídeo sem título',
      channelTitle: item.snippet?.channelTitle || 'Canal do YouTube',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ''
    }))
    const data = { items }
    cache.set(cacheKey, { data, expires: Date.now() + cacheTtl })
    res.set('Cache-Control', 'no-store')
    res.json(data)
  } catch {
    res.status(502).json({ error: 'Falha de conexão com o serviço do YouTube. Tente novamente.' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')))
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))
}
app.listen(port, '0.0.0.0', () => console.log(`Radio Viva API listening on ${port}`))
