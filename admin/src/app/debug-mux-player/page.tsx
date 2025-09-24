"use client"

import { useState, useEffect } from "react"
// Removed NextAuth import - auth handled server-side
import MuxPlayer from "@mux/mux-player-react"

export default function DebugMuxPlayer() {
  // Auth session handled server-side
  const [logs, setLogs] = useState<string[]>([])
  const [tokens, setTokens] = useState<any>({})
  const [playbackId] = useState("tKRSmXUmgpYKdkhpEcR4QWM9BIUP3xwH5DIHSluByQs")
  const [showPlayer, setShowPlayer] = useState(false)

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1]
    const log = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`
    console.log(log)
    setLogs(prev => [...prev, log])
  }

  // Intercept fetch to log all Mux requests
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : args[0].toString()
      if (url.includes('mux.com')) {
        addLog(`Mux Request: ${url}`)
      }
      
      try {
        const response = await originalFetch(...args)
        if (url.includes('mux.com') && !response.ok) {
          addLog(`Mux Error ${response.status}: ${url}`)
          // Clone response to read body
          const cloned = response.clone()
          try {
            const text = await cloned.text()
            addLog('Response body', text)
          } catch {}
        }
        return response
      } catch (error) {
        if (url.includes('mux.com')) {
          addLog(`Mux Fetch Error: ${url}`, error)
        }
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const fetchToken = async () => {
    addLog("Fetching token...")
    
    try {
      const response = await fetch('/api/mux/playback-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbackId,
          lessonId: "test-lesson-id" // You'll need to use a real lesson ID
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        addLog("Token received", { 
          tokenLength: data.token?.length,
          expiresIn: data.expiresIn 
        })
        
        // Parse the token to see its contents
        try {
          const [header, payload] = data.token.split('.').slice(0, 2)
          const decodedHeader = JSON.parse(atob(header))
          const decodedPayload = JSON.parse(atob(payload))
          
          addLog("Token Header", decodedHeader)
          addLog("Token Payload", decodedPayload)
        } catch (e) {
          addLog("Failed to decode token")
        }
        
        setTokens({ playback: data.token })
      } else {
        addLog("Token fetch failed", data)
      }
    } catch (error) {
      addLog("Token fetch error", error)
    }
  }

  const handlePlayerError = (event: any) => {
    addLog("Player Error", {
      type: event.type,
      message: event.detail?.message,
      code: event.detail?.code
    })
  }



  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mux Player Debug</h1>
      
      <div className="mb-4 space-y-2">
        <p>Debug Mode</p>
        <p>Playback ID: {playbackId}</p>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={fetchToken}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Fetch Token
        </button>
        
        <button
          onClick={() => setShowPlayer(!showPlayer)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {showPlayer ? 'Hide' : 'Show'} Player
        </button>
        
        <button
          onClick={() => setLogs([])}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Logs
        </button>
      </div>

      {showPlayer && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Player</h2>
          <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <MuxPlayer
              playbackId={playbackId}
              tokens={tokens}
              onError={handlePlayerError}
              debug
              streamType="on-demand"
              primaryColor="#17ADE9"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Logs</h2>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
