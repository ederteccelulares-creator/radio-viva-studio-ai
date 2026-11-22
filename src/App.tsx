import { useMemo, useState } from 'react'
import { Radio, Play, Pause, SkipForward, Volume2, Search, Send, Settings, ListMusic, Mic2, Headphones, RadioTower, Music2, Users, Megaphone, Sparkles, Disc3, Clock3, Menu, X } from 'lucide-react'

type Track = { id: number; title: string; artist: string; duration: string; requestedBy?: string }
const initialTracks: Track[] = [
  { id: 1, title: 'A playlist começa aqui', artist: 'Radio Viva Studio', duration: '—' },
  { id: 2, title: 'Sua próxima música favorita', artist: 'Biblioteca da rádio', duration: '—' },
  { id: 3, title: 'Som que conecta', artist: 'Radio Viva', duration: '—' },
]
export default function App() {
  const [playing, setPlaying] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [query, setQuery] = useState('')
  const [listener, setListener] = useState('')
  const [queue, setQueue] = useState<Track[]>(initialTracks)
  const [current, setCurrent] = useState(0)
  const [volume, setVolume] = useState(75)
  const [notice, setNotice] = useState('Bem-vindo! Peça sua música e o DJ IA prepara a locução.')
  const [mobileMenu, setMobileMenu] = useState(false)
  const track = queue[current] ?? initialTracks[0]
  const next = queue[(current + 1) % queue.length]
  const filtered = useMemo(() => queue, [queue])
  function announce(text: string) {
    setNotice(text)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'; utterance.rate = 1; window.speechSynthesis.speak(utterance)
    }
  }
  function requestSong(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const item = { id: Date.now(), title: query.trim(), artist: 'Pedido do ouvinte', duration: 'Aguardando', requestedBy: listener.trim() || 'Ouvinte' }
    setQueue(q => [...q, item])
    announce(`Pedido recebido de ${item.requestedBy}: ${item.title}. Obrigado por participar da Radio Viva!`)
    setQuery('')
  }
  function nextTrack() {
    if (!queue.length) return
    const index = (current + 1) % queue.length
    setCurrent(index)
    const t = queue[index]
    announce(t.requestedBy ? `Agora atendendo o pedido de ${t.requestedBy}: ${t.title}.` : `A seguir: ${t.title}, de ${t.artist}.`)
  }
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-icon"><Radio size={23}/></div><div><b>RADIO VIVA</b><span>STUDIO AI</span></div><button className="mobile-close" onClick={() => setMobileMenu(false)}><X/></button></div>
      <div className="live-pill"><i/> SISTEMA EM DEMONSTRAÇÃO</div>
      <div className="nav-label">ESTÚDIO</div>
      <button className={!admin ? 'nav-item active' : 'nav-item'} onClick={() => {setAdmin(false);setMobileMenu(false)}}><RadioTower/> Rádio ao vivo</button>
      <button className={admin ? 'nav-item active' : 'nav-item'} onClick={() => {setAdmin(true);setMobileMenu(false)}}><Settings/> Painel administrativo</button>
      <div className="nav-label">RECURSOS</div>
      <div className="nav-item muted"><ListMusic/> Fila de músicas</div>
      <div className="nav-item muted"><Mic2/> DJ Inteligente</div>
      <div className="nav-item muted"><Megaphone/> Publicidade</div>
      <div className="sidebar-bottom"><div className="ai-card"><div className="ai-orb"><Sparkles size={18}/></div><b>DJ VIVA IA</b><p>Locução inteligente em português</p><span className="status"><i/> Voz do navegador disponível</span></div><div className="profile"><div className="avatar">RV</div><div><b>Radio Viva</b><span>Estação principal</span></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(true)}><Menu/></button><div className="breadcrumb">Estúdio <span>/</span> {admin ? 'Administração' : 'Rádio ao vivo'}</div><div className="top-right"><span className="connection"><i/> Interface conectada</span><button className="admin-toggle" onClick={() => setAdmin(!admin)}>{admin ? 'Voltar à rádio' : 'Acessar painel'} <Settings size={15}/></button></div></header>
      {admin ? <section className="content"><div className="page-heading"><div><div className="eyebrow">CONTROLE DA ESTAÇÃO</div><h1>Painel administrativo</h1><p>Central de operação da Radio Viva Studio AI.</p></div><span className="demo-tag">VERSÃO INICIAL</span></div><div className="stats-grid"><div className="stat-card"><Users/><span>Ouvintes conectados</span><strong>—</strong><small>Integração de audiência pendente</small></div><div className="stat-card"><Music2/><span>Músicas na fila</span><strong>{queue.length}</strong><small>Pedidos nesta sessão</small></div><div className="stat-card"><Mic2/><span>DJ IA</span><strong>Disponível</strong><small>Locução pelo navegador</small></div><div className="stat-card"><Megaphone/><span>Campanhas</span><strong>0</strong><small>Nenhum banner cadastrado</small></div></div><div className="panel"><div className="panel-title"><div><h2>Fila de reprodução</h2><p>Pedidos e faixas adicionadas nesta sessão</p></div><span className="count">{queue.length} faixas</span></div>{filtered.map((t,i)=><div className="queue-row" key={t.id}><span className="track-number">{String(i+1).padStart(2,'0')}</span><div className="mini-cover"><Disc3/></div><div className="track-info"><b>{t.title}</b><span>{t.artist}{t.requestedBy ? ` · pedido de ${t.requestedBy}` : ''}</span></div>{i===current && <span className="playing-label">ATUAL</span>}</div>)}</div><div className="panel config-panel"><div className="panel-title"><div><h2>Configurações do DJ IA</h2><p>Locução de teste usando a voz disponível no dispositivo.</p></div><Sparkles/></div><button className="primary-button" onClick={() => announce(`Olá! Você está ouvindo a Radio Viva. A música atual é ${track.title}.`)}><Mic2 size={17}/> Testar locução</button></div></section> :
      <section className="content"><div className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> TRANSMISSÃO DA ESTAÇÃO</div><h1>A música aproxima.<br/><em>A Viva conecta.</em></h1><p>Seu espaço de música, companhia e boas vibrações. Faça seu pedido e deixe o DJ IA cuidar da locução.</p><div className="hero-actions"><button className="primary-button" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18}/> : <Play size={18} fill="currentColor"/>}{playing ? 'Pausar rádio' : 'Iniciar experiência'}</button><span className="listeners"><Headphones size={16}/> Rádio online</span></div></div><div className="hero-art"><div className="ring ring-one"/><div className="ring ring-two"/><div className="art-core"><Radio size={55}/><span>VIVA</span></div><div className="equalizer">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+(i*17%42)}px`}}/>)}</div><div className="art-caption"><span className="live-dot"/> ON AIR</div></div></div>
      <div className="section-heading"><div><div className="eyebrow">NO AR AGORA</div><h2>O som da sua rádio</h2></div><span className="live-badge"><i/> AO VIVO · DEMO</span></div>
      <div className="player-card"><div className="album-art"><div className="vinyl"><div className="vinyl-center"><Radio size={27}/></div></div><span>RADIO VIVA</span></div><div className="player-details"><div className="now-label"><span className="sound-bars"><i/><i/><i/></span> TOCANDO AGORA</div><h3>{track.title}</h3><p>{track.artist}</p><div className="progress"><span/></div><div className="time-row"><span>--:--</span><span>--:--</span></div><div className="controls"><button onClick={nextTrack} aria-label="Faixa anterior indisponível"><SkipForward className="back-icon"/></button><button className="play-button" onClick={() => setPlaying(!playing)}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button onClick={nextTrack} aria-label="Próxima música"><SkipForward/></button><div className="volume"><Volume2 size={17}/><input type="range" min="0" max="100" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></div></div><div className="next-card"><span>NA SEQUÊNCIA</span><div className="next-cover"><Music2/></div><b>{next?.title ?? 'Fila vazia'}</b><small>{next?.artist ?? 'Adicione um pedido'}</small></div></div>
      <div className="lower-grid"><div className="request-panel"><div className="panel-title"><div><div className="eyebrow">PARTICIPE DA PROGRAMAÇÃO</div><h2>Peça sua música</h2><p>Digite o nome da música ou do artista. O DJ recebe seu pedido!</p></div><div className="request-icon"><Search/></div></div><form className="request-form" onSubmit={requestSong}><label>QUAL MÚSICA VOCÊ QUER OUVIR?</label><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: nome da música ou artista" required/></div><label>SEU NOME</label><div className="search-box"><Users size={18}/><input value={listener} onChange={e=>setListener(e.target.value)} placeholder="Como podemos te chamar?"/></div><button className="primary-button send-button" type="submit"><Send size={17}/> Enviar pedido</button></form></div><div className="side-panels"><div className="voice-panel"><div className="voice-icon"><Sparkles/></div><div><span>LOCUTOR VIRTUAL</span><b>DJ Viva IA</b><p>{notice}</p></div><button onClick={() => announce(`Olá, ${listener || 'ouvinte'}! Você está na Radio Viva. ${track.title} é o som de agora!`)} aria-label="Ouvir locução"><Play size={16}/></button></div><div className="up-next"><div className="panel-title"><div><h2>Próximas na fila</h2><p>Programação da estação</p></div><span className="count">{queue.length}</span></div>{queue.slice(current+1,current+4).map((t,i)=><div className="queue-row compact" key={t.id}><span className="track-number">{String(i+1).padStart(2,'0')}</span><div className="track-info"><b>{t.title}</b><span>{t.artist}</span></div><Clock3 size={15}/></div>)}{queue.length<=current+1&&<p className="empty-queue">Seus pedidos aparecerão aqui.</p>}</div></div></div>
      </section>}
      <footer><span>© 2026 Radio Viva Studio AI</span><span>Feito para conectar pessoas através da música <Radio size={13}/></span></footer>
    </main>
  </div>
}