import { useMemo, useState } from 'react'
import { Radio, Play, Pause, SkipForward, Volume2, Search, Send, Settings, ListMusic, Mic2, Headphones, RadioTower, Music2, Users, Megaphone, Sparkles, Disc3, Clock3, Menu, X, LoaderCircle, Plus, Youtube } from 'lucide-react'
import YoutubePlayer from './YoutubePlayer'

type Track = { id: string; title: string; artist: string; thumbnail: string; requestedBy?: string }
type SearchItem = { videoId: string; title: string; channelTitle: string; thumbnail: string }
export default function App() {
  const [admin, setAdmin] = useState(false)
  const [query, setQuery] = useState('')
  const [listener, setListener] = useState('')
  const [queue, setQueue] = useState<Track[]>([])
  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(75)
  const [results, setResults] = useState<SearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('Pesquise uma música para começar a programação.')
  const [mobileMenu, setMobileMenu] = useState(false)
  const next = queue[0]
  const upcoming = useMemo(() => queue.slice(0, 4), [queue])
  function announce(text: string) {
    setNotice(text)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'; utterance.rate = 1
      window.speechSynthesis.speak(utterance)
    }
  }
  async function searchSongs(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true); setError(''); setResults([])
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível pesquisar no YouTube.')
      setResults(data.items || [])
      if (!data.items?.length) setError('Nenhum vídeo encontrado. Tente outro nome de música ou artista.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consultar o YouTube.')
    } finally { setSearching(false) }
  }
  function addTrack(item: SearchItem) {
    const track: Track = { id: item.videoId, title: item.title, artist: item.channelTitle, thumbnail: item.thumbnail, requestedBy: listener.trim() || 'Ouvinte' }
    if (!current) { setCurrent(track); setPlaying(true); announce(`Atenção! Pedido de ${track.requestedBy}. Vamos ouvir ${track.title}, de ${track.artist}, na Radio Viva!`) }
    else { setQueue(q => [...q, track]); announce(`Pedido de ${track.requestedBy} adicionado à fila: ${track.title}.`) }
    setResults([]); setQuery('')
  }
  function nextTrack() {
    if (!queue.length) { setCurrent(null); setPlaying(false); return }
    const [track, ...rest] = queue
    setQueue(rest); setCurrent(track); setPlaying(true)
    announce(track.requestedBy ? `Agora atendendo o pedido de ${track.requestedBy}: ${track.title}.` : `A seguir: ${track.title}, de ${track.artist}.`)
  }
  function requestFromSearch(e: React.FormEvent) { void searchSongs(e) }
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-icon"><Radio size={23}/></div><div><b>RADIO VIVA</b><span>STUDIO AI</span></div><button className="mobile-close" onClick={() => setMobileMenu(false)}><X/></button></div>
      <div className="live-pill"><i/> YOUTUBE MUSIC SEARCH</div>
      <div className="nav-label">ESTÚDIO</div>
      <button className={!admin ? 'nav-item active' : 'nav-item'} onClick={() => {setAdmin(false);setMobileMenu(false)}}><RadioTower/> Rádio ao vivo</button>
      <button className={admin ? 'nav-item active' : 'nav-item'} onClick={() => {setAdmin(true);setMobileMenu(false)}}><Settings/> Painel administrativo</button>
      <div className="nav-label">RECURSOS</div>
      <div className="nav-item muted"><ListMusic/> Fila de músicas</div>
      <div className="nav-item muted"><Mic2/> DJ Inteligente</div>
      <div className="nav-item muted"><Megaphone/> Publicidade</div>
      <div className="sidebar-bottom"><div className="ai-card"><div className="ai-orb"><Sparkles size={18}/></div><b>DJ VIVA IA</b><p>Locução em português entre os pedidos</p><span className="status"><i/> Voz do navegador disponível</span></div><div className="profile"><div className="avatar">RV</div><div><b>Radio Viva</b><span>Estação principal</span></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(true)}><Menu/></button><div className="breadcrumb">Estúdio <span>/</span> {admin ? 'Administração' : 'Rádio ao vivo'}</div><div className="top-right"><span className="connection"><i/> API do YouTube integrada</span><button className="admin-toggle" onClick={() => setAdmin(!admin)}>{admin ? 'Voltar à rádio' : 'Acessar painel'} <Settings size={15}/></button></div></header>
      {admin ? <section className="content"><div className="page-heading"><div><div className="eyebrow">CONTROLE DA ESTAÇÃO</div><h1>Painel administrativo</h1><p>Central de operação da Radio Viva Studio AI.</p></div><span className="demo-tag">MÓDULO YOUTUBE</span></div><div className="stats-grid"><div className="stat-card"><Users/><span>Ouvintes conectados</span><strong>—</strong><small>Integração de audiência pendente</small></div><div className="stat-card"><Music2/><span>Músicas na fila</span><strong>{queue.length}</strong><small>Pedidos aguardando</small></div><div className="stat-card"><Mic2/><span>DJ IA</span><strong>Disponível</strong><small>Locução do navegador</small></div><div className="stat-card"><Youtube/><span>Pesquisa YouTube</span><strong>Ativa</strong><small>API configurada no servidor</small></div></div><div className="panel"><div className="panel-title"><div><h2>Fila de reprodução</h2><p>Vídeos selecionados pelos ouvintes</p></div><span className="count">{queue.length} faixas</span></div>{queue.length ? queue.map((t,i)=><div className="queue-row" key={t.id}><span className="track-number">{String(i+1).padStart(2,'0')}</span><img className="mini-thumb" src={t.thumbnail} alt=""/><div className="track-info"><b>{t.title}</b><span>{t.artist} · pedido de {t.requestedBy}</span></div></div>) : <p className="empty-queue">Ainda não há músicas aguardando.</p>}</div><div className="panel config-panel"><div className="panel-title"><div><h2>Teste de locução</h2><p>O DJ anuncia a música atual usando a voz do dispositivo.</p></div><Sparkles/></div><button className="primary-button" onClick={() => announce(current ? `Você está ouvindo ${current.title}, de ${current.artist}, na Radio Viva.` : 'Bem-vindo à Radio Viva. Escolha uma música para começar!')}><Mic2 size={17}/> Testar locução</button></div></section> :
      <section className="content"><div className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> PROGRAMAÇÃO COM YOUTUBE</div><h1>A música aproxima.<br/><em>A Viva conecta.</em></h1><p>Pesquise sua música no YouTube, envie seu pedido e deixe o DJ Viva anunciar sua participação.</p><div className="hero-actions"><button className="primary-button" onClick={() => current ? setPlaying(!playing) : document.getElementById('music-search')?.focus()}>{playing ? <Pause size={18}/> : <Play size={18} fill="currentColor"/>}{playing ? 'Pausar vídeo' : 'Escolher música'}</button><span className="listeners"><Headphones size={16}/> Player oficial incorporado</span></div></div><div className="hero-art"><div className="ring ring-one"/><div className="ring ring-two"/><div className="art-core"><Radio size={55}/><span>VIVA</span></div><div className="equalizer">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+(i*17%42)}px`}}/>)}</div><div className="art-caption"><span className="live-dot"/> ON AIR</div></div></div>
      <div className="section-heading"><div><div className="eyebrow">NO AR AGORA</div><h2>O som da sua rádio</h2></div><span className="live-badge"><i/> {playing ? 'REPRODUZINDO' : 'AGUARDANDO'}</span></div>
      <div className="player-card youtube-player-card"><div className="player-details"><div className="now-label"><span className="sound-bars"><i/><i/><i/></span> TOCANDO AGORA</div><h3>{current?.title || 'Escolha uma música no YouTube'}</h3><p>{current?.artist || 'A pesquisa aparece logo abaixo'}</p><div className="controls"><button className="play-button" onClick={() => current && setPlaying(!playing)} disabled={!current}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button onClick={nextTrack} aria-label="Próxima música" disabled={!queue.length}><SkipForward/></button><div className="volume"><Volume2 size={17}/><input type="range" min="0" max="100" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></div></div><div className="next-card"><span>NA SEQUÊNCIA</span>{next ? <><img className="next-cover-img" src={next.thumbnail} alt=""/><b>{next.title}</b><small>{next.artist}</small></> : <><div className="next-cover"><Music2/></div><b>Fila vazia</b><small>Peça uma música</small></>}</div></div>
      {current && <div className="youtube-embed-wrap"><YoutubePlayer videoId={current.id} playing={playing} volume={volume} onEnded={nextTrack} onPlayState={setPlaying}/><p className="player-disclaimer">Reprodução oficial do YouTube. Alguns vídeos podem não permitir incorporação.</p></div>}
      <div className="lower-grid"><div className="request-panel"><div className="panel-title"><div><div className="eyebrow">PARTICIPE DA PROGRAMAÇÃO</div><h2>Peça sua música</h2><p>Pesquise no YouTube e escolha o resultado desejado.</p></div><div className="request-icon"><Search/></div></div><form className="request-form" onSubmit={requestFromSearch}><label>NOME DA MÚSICA OU ARTISTA</label><div className="search-box"><Search size={18}/><input id="music-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: Henrique e Juliano, Evidências..." required/></div><label>SEU NOME</label><div className="search-box"><Users size={18}/><input value={listener} onChange={e=>setListener(e.target.value)} placeholder="Como podemos te chamar?"/></div><button className="primary-button send-button" type="submit" disabled={searching}>{searching ? <LoaderCircle className="spin" size={17}/> : <Search size={17}/>} {searching ? 'Pesquisando...' : 'Pesquisar no YouTube'}</button></form>{error && <p className="search-error">{error}</p>}{results.length>0 && <div className="search-results"><div className="results-heading">RESULTADOS ENCONTRADOS <span>{results.length}</span></div>{results.map(item=><div className="result-row" key={item.videoId}><img src={item.thumbnail} alt=""/><div className="result-info"><b>{item.title}</b><span>{item.channelTitle}</span></div><button onClick={()=>addTrack(item)} title="Adicionar à rádio"><Plus size={18}/></button></div>)}</div>}</div><div className="side-panels"><div className="voice-panel"><div className="voice-icon"><Sparkles/></div><div><span>LOCUTOR VIRTUAL</span><b>DJ Viva IA</b><p>{notice}</p></div><button onClick={() => announce(current ? `Olá, ${listener || 'ouvinte'}! Agora na Radio Viva: ${current.title}, de ${current.artist}.` : 'Olá! Você está na Radio Viva. Peça sua música!')} aria-label="Ouvir locução"><Play size={16}/></button></div><div className="up-next"><div className="panel-title"><div><h2>Próximas na fila</h2><p>Pedidos aguardando reprodução</p></div><span className="count">{queue.length}</span></div>{upcoming.map((t,i)=><div className="queue-row compact" key={t.id}><span className="track-number">{String(i+1).padStart(2,'0')}</span><img className="mini-thumb" src={t.thumbnail} alt=""/><div className="track-info"><b>{t.title}</b><span>Pedido de {t.requestedBy}</span></div></div>)}{!queue.length&&<p className="empty-queue">Seus pedidos aparecerão aqui.</p>}</div></div></div>
      </section>}
      <footer><span>© 2026 Radio Viva Studio AI</span><span>Reprodução via YouTube <Radio size={13}/></span></footer>
    </main>
    {current && <div className="youtube-player-host"><YoutubePlayer videoId={current.id} playing={playing} volume={volume} onEnded={nextTrack} onPlayState={setPlaying} compact/> </div>}
  </div>
}