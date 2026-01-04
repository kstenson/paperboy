'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2, Download } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface AudioPlayerProps {
  audioUrl: string
  title: string
  duration?: number
}

export default function AudioPlayer({ audioUrl, title, duration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)
  const [volume, setVolume] = useState(1)
  const [isSeeking, setIsSeeking] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }

    const updateDuration = () => {
      setTotalDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [isSeeking])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    audio.currentTime = time
  }

  const handleSeekStart = () => {
    setIsSeeking(true)
  }

  const handleSeekEnd = () => {
    setIsSeeking(false)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    audio.volume = newVolume
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(totalDuration, audio.currentTime + seconds))
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'

    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const audio = audioRef.current
      if (!audio) return

      // Only handle if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayPause()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        skip(-15)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        skip(15)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>

        {/* Skip Back */}
        <button
          onClick={() => skip(-15)}
          className="flex-shrink-0 p-2 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700/30 rounded transition-colors"
          title="Skip back 15s"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-purple-700 dark:text-purple-300 font-mono">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={totalDuration || 0}
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              className="flex-1 h-2 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />

            <span className="text-xs text-purple-700 dark:text-purple-300 font-mono">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Skip Forward */}
        <button
          onClick={() => skip(15)}
          className="flex-shrink-0 p-2 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700/30 rounded transition-colors"
          title="Skip forward 15s"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Volume2 className="w-5 h-5 text-purple-700 dark:text-purple-300" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>

        {/* Download Button */}
        <a
          href={audioUrl}
          download
          className="flex-shrink-0 p-2 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700/30 rounded transition-colors"
          title="Download audio"
        >
          <Download className="w-5 h-5" />
        </a>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
        <span className="font-medium">Shortcuts:</span> Space = Play/Pause, ← = -15s, → = +15s
      </div>
    </div>
  )
}
