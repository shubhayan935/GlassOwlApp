import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SessionEvent {
  t: string;
  ts: number;
  [key: string]: any;
}

interface SessionChunk {
  idx: number;
  startTs: number;
  endTs: number;
  hasSnapshot: boolean;
  events: SessionEvent[];
}

interface SessionDetail {
  sessionId: string;
  projectKey: string;
  dvf: string;
  userId?: string;
  startedAt: number;
  lastActivity: number;
  chunks: SessionChunk[];
}

interface ReplayPlayerProps {
  session: SessionDetail;
  onClose: () => void;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
}

interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({ session, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    totalDuration: session.lastActivity - session.startedAt,
    playbackSpeed: 1,
  });

  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    x: 0,
    y: 0,
    visible: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<SessionEvent[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<any>(null);

  const playbackIntervalRef = useRef<number | null>(null);
  const lastEventIndexRef = useRef(0);

  // Extract and sort all events from chunks
  useEffect(() => {
    try {
      const events: SessionEvent[] = [];
      let snapshot = null;

      // Process chunks in order
      const sortedChunks = [...session.chunks].sort((a, b) => a.idx - b.idx);

      for (const chunk of sortedChunks) {
        for (const event of chunk.events || []) {
          if (event.t === 'snapshot') {
            snapshot = event.snapshot;
          } else {
            events.push({
              ...event,
              // Ensure timestamp is relative to session start
              ts: event.ts,
            });
          }
        }
      }

      // Sort events by timestamp
      events.sort((a, b) => a.ts - b.ts);

      setAllEvents(events);
      setInitialSnapshot(snapshot);
      setLoading(false);

      if (!snapshot) {
        setError('No initial snapshot found in session data');
      }
    } catch (err) {
      setError('Failed to process session data');
      setLoading(false);
    }
  }, [session]);

  // Initialize iframe with snapshot
  useEffect(() => {
    if (initialSnapshot && iframeRef.current) {
      try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (iframeDoc) {
          // Reconstruct the DOM from snapshot
          iframeDoc.open();
          iframeDoc.write(`
            ${initialSnapshot.doctype || '<!DOCTYPE html>'}
            ${initialSnapshot.html || '<html><body><p>No content found</p></body></html>'}
          `);
          iframeDoc.close();

          // Add CSS styles
          if (initialSnapshot.css && initialSnapshot.css.length > 0) {
            const styleEl = iframeDoc.createElement('style');
            styleEl.textContent = initialSnapshot.css.join('\n');
            iframeDoc.head?.appendChild(styleEl);
          }

          // Disable all interactions in the replay
          const disableInteractions = iframeDoc.createElement('style');
          disableInteractions.textContent = `
            * {
              pointer-events: none !important;
              user-select: none !important;
            }
            body {
              overflow: hidden !important;
            }
          `;
          iframeDoc.head?.appendChild(disableInteractions);

          console.log('Replay: DOM reconstructed successfully');
        }
      } catch (err) {
        console.error('Failed to reconstruct DOM:', err);
        setError('Failed to reconstruct DOM from snapshot');
      }
    }
  }, [initialSnapshot]);

  // Process events at current playback time
  const processEventsUpToTime = useCallback((targetTime: number) => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    let newCursorPos = { ...cursorPosition };

    // Process all events up to target time
    for (let i = lastEventIndexRef.current; i < allEvents.length; i++) {
      const event = allEvents[i];

      if (event.ts > targetTime) break;

      try {
        switch (event.t) {
          case 'mouse':
            newCursorPos = {
              x: event.x || 0,
              y: event.y || 0,
              visible: true,
            };
            break;

          case 'click':
            // Highlight click position briefly
            if (event.x !== undefined && event.y !== undefined) {
              newCursorPos = { x: event.x, y: event.y, visible: true };
              // Add click animation
              setTimeout(() => {
                if (cursorRef.current) {
                  cursorRef.current.style.transform = 'scale(1.5)';
                  cursorRef.current.style.backgroundColor = '#ff4757';
                  setTimeout(() => {
                    if (cursorRef.current) {
                      cursorRef.current.style.transform = 'scale(1)';
                      cursorRef.current.style.backgroundColor = '#2ed573';
                    }
                  }, 100);
                }
              }, 0);
            }
            break;

          case 'scroll':
            // Apply scroll position to iframe
            try {
              const iframeWindow = iframe.contentWindow;
              if (iframeWindow && event.x !== undefined && event.y !== undefined) {
                iframeWindow.scrollTo(event.x, event.y);
              }
            } catch (e) {
              console.warn('Failed to apply scroll:', e);
            }
            break;

          case 'mut':
            // Apply DOM mutations
            try {
              if (event.ops && iframe.contentDocument) {
                console.log('Replay: Applying', event.ops.length, 'mutations');
                this.applyMutations(event.ops, iframe.contentDocument);
              }
            } catch (e) {
              console.warn('Failed to apply mutation:', e);
            }
            break;

          case 'route':
            // Show route change indicator
            console.log('Replay: Route changed to', event.path);
            break;
        }

        lastEventIndexRef.current = i + 1;
      } catch (err) {
        console.warn('Failed to process event:', event, err);
      }
    }

    setCursorPosition(newCursorPos);
  }, [allEvents, cursorPosition]);

  // Playback loop
  useEffect(() => {
    if (playbackState.isPlaying) {
      playbackIntervalRef.current = window.setInterval(() => {
        setPlaybackState(prev => {
          const newTime = prev.currentTime + (100 * prev.playbackSpeed); // 100ms intervals

          if (newTime >= prev.totalDuration) {
            // Playback finished
            return { ...prev, isPlaying: false, currentTime: prev.totalDuration };
          }

          // Process events up to current time
          processEventsUpToTime(newTime);

          return { ...prev, currentTime: newTime };
        });
      }, 100);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.playbackSpeed, processEventsUpToTime]);

  const handlePlay = () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSeek = (newTime: number) => {
    // Reset to beginning and replay up to new time
    lastEventIndexRef.current = 0;
    setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
    processEventsUpToTime(newTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackState(prev => ({ ...prev, playbackSpeed: speed }));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        color: 'white'
      }}>
        <div>Loading replay...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h3>Replay Error</h3>
          <p>{error}</p>
          <button onClick={onClose} style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: '#2c3e50',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0 }}>🎬 Session Replay</h3>
          <small style={{ opacity: 0.8 }}>
            {session.sessionId.substring(0, 20)}... |
            User: {session.userId || 'Anonymous'} |
            {allEvents.length} events
          </small>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Replay Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          background: 'white',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          sandbox="allow-same-origin"
        />

        {/* Cursor */}
        {cursorPosition.visible && (
          <div
            ref={cursorRef}
            style={{
              position: 'absolute',
              left: cursorPosition.x - 6,
              top: cursorPosition.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#2ed573',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              zIndex: 10000,
              transition: 'all 0.1s ease-out',
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div style={{
        background: '#34495e',
        color: 'white',
        padding: '15px 20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '10px',
        }}>
          <button
            onClick={handlePlay}
            style={{
              background: playbackState.isPlaying ? '#e74c3c' : '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              minWidth: '80px',
            }}
          >
            {playbackState.isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px' }}>Speed:</span>
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                style={{
                  background: playbackState.playbackSpeed === speed ? '#3498db' : '#7f8c8d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          <div style={{ fontSize: '14px' }}>
            {formatTime(playbackState.currentTime)} / {formatTime(playbackState.totalDuration)}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min={0}
            max={playbackState.totalDuration}
            value={playbackState.currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              background: '#7f8c8d',
              outline: 'none',
              borderRadius: '3px',
            }}
          />
        </div>
      </div>
    </div>
  );
};