import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}
type YTPlayer = {
  playVideo: () => void; pauseVideo: () => void; setVolume: (value: number) => void
  loadVideoById: (videoId: string) => void; destroy: () => void
}
type Props = { videoId: string; playing: boolean; volume: number; onEnded: () => void; onPlayState: (playing: boolean) => void; compact?: boolean }
let apiPromise: Promise<void> | null = null
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve()
  if (!apiPromise) apiPromise = new Promise(resolve => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve() }
    if (!document.querySelector('script[data-youtube-iframe-api]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.dataset.youtubeIframeApi = 'true'
      document.head.appendChild(script)
    }
  })
  return apiPromise
}
export default function YoutubePlayer({ videoId, playing, volume, onEnded, onPlayState, compact = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const callbacks = useRef({ onEnded, onPlayState })
  callbacks.current = { onEnded, onPlayState }
  const lastVideo = useRef('')
  useEffect(() => {
    let cancelled = false
    loadYoutubeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return
      playerRef.current = new window.YT.Player(mountRef.current, {
        width: '100%', height: '100%',
        videoId,
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: (event: { target: YTPlayer }) => { event.target.setVolume(volume); if (playing) event.target.playVideo() },
          onStateChange: (event: { data: number }) => {
            if (event.data === 0) callbacks.current.onEnded()
            if (event.data === 1) callbacks.current.onPlayState(true)
            if (event.data === 2 || event.data === 5) callbacks.current.onPlayState(false)
          },
          onAutoplayBlocked: () => callbacks.current.onPlayState(false)
        }
      })
      lastVideo.current = videoId
    })
    return () => { cancelled = true; playerRef.current?.destroy(); playerRef.current = null }
  // Player instance is recreated only when the component mounts for a selected video.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    if (lastVideo.current !== videoId) { lastVideo.current = videoId; player.loadVideoById(videoId) }
  }, [videoId])
  useEffect(() => { const p = playerRef.current; if (p) { p.setVolume(volume); if (playing) p.playVideo(); else p.pauseVideo() } }, [playing, volume])
  return <div className={compact ? 'youtube-api-hidden' : 'youtube-frame'}><div ref={mountRef} /></div>
}