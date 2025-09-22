import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReplayPlayer } from '../components/ReplayPlayer';

interface Session {
  sessionId: string;
  projectKey: string;
  dvf: string;
  userId?: string;
  startedAt: number;
  lastActivity: number;
  chunkCount: number;
}

interface SessionDetail {
  sessionId: string;
  projectKey: string;
  dvf: string;
  userId?: string;
  startedAt: number;
  lastActivity: number;
  chunks: any[];
}

export const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [replaySession, setReplaySession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:3001/sessions');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (sessionId: string): Promise<SessionDetail | null> => {
    try {
      const response = await fetch(`http://localhost:3001/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setSelectedSession(data.session);
      return data.session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session details');
      return null;
    }
  };

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (start: number, end: number) => {
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const truncateId = (id: string, length = 12) => {
    return id.length > length ? id.substring(0, length) + '...' : id;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #ff6b6b'
      }}>
        <h2 style={{ color: '#ff6b6b', marginTop: 0 }}>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchSessions();
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginTop: 0 }}>📹 Session Replays</h1>
        <p style={{ color: '#666', marginBottom: 0 }}>
          Recorded user sessions from GlassOwl telemetry. Data refreshes every 5 seconds.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>No Sessions Recorded Yet</h3>
          <p>Visit the <Link to="/">Home</Link> or <Link to="/about">About</Link> pages to generate some telemetry data!</p>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>Recorded Sessions ({sessions.length})</h2>
            <button
              onClick={fetchSessions}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Session ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Started</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Duration</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Chunks</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>DVF</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice().reverse().map((session) => (
                  <tr key={session.sessionId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                      {truncateId(session.sessionId)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {session.userId ? (
                        <span style={{
                          background: '#e3f2fd',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}>
                          {session.userId}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>Anonymous</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px' }}>
                      {formatTimestamp(session.startedAt)}
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px' }}>
                      {formatDuration(session.startedAt, session.lastActivity)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        background: session.chunkCount > 5 ? '#d4edda' : '#f8d7da',
                        color: session.chunkCount > 5 ? '#155724' : '#721c24',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {session.chunkCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '10px' }}>
                      {session.dvf.substring(7, 19)}...
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            fetchSessionDetail(session.sessionId);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Details
                        </button>
                        <button
                          onClick={async () => {
                            const sessionDetail = await fetchSessionDetail(session.sessionId);
                            if (sessionDetail) {
                              setReplaySession(sessionDetail);
                            }
                          }}
                          disabled={session.chunkCount === 0}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: session.chunkCount > 0 ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: session.chunkCount > 0 ? 'pointer' : 'not-allowed',
                            fontSize: '12px'
                          }}
                        >
                          ▶ Replay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedSession && (
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '2px solid #007bff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Session Details</h3>
            <button
              onClick={() => setSelectedSession(null)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <strong>Session ID:</strong>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '5px' }}>
                {selectedSession.sessionId}
              </div>
            </div>
            <div>
              <strong>User:</strong>
              <div style={{ marginTop: '5px' }}>
                {selectedSession.userId || 'Anonymous'}
              </div>
            </div>
            <div>
              <strong>Duration:</strong>
              <div style={{ marginTop: '5px' }}>
                {formatDuration(selectedSession.startedAt, selectedSession.lastActivity)}
              </div>
            </div>
            <div>
              <strong>Chunks:</strong>
              <div style={{ marginTop: '5px' }}>
                {selectedSession.chunks.length} chunks recorded
              </div>
            </div>
          </div>

          <div>
            <strong>Design Version Fingerprint:</strong>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              background: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px',
              marginTop: '5px',
              wordBreak: 'break-all'
            }}>
              {selectedSession.dvf}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Chunks Timeline</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
              {selectedSession.chunks.map((chunk, index) => (
                <div key={index} style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '12px'
                }}>
                  <strong>Chunk {chunk.idx}:</strong> {chunk.events?.length || 0} events
                  {chunk.hasSnapshot && (
                    <span style={{
                      background: '#ffeaa7',
                      color: '#2d3436',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      marginLeft: '8px',
                      fontSize: '10px'
                    }}>
                      KEYFRAME
                    </span>
                  )}
                  <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                    {chunk.startTs}ms - {chunk.endTs}ms
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#e8f5e8',
            borderRadius: '4px',
            border: '1px solid #28a745'
          }}>
            <h4 style={{ marginTop: 0, color: '#155724' }}>🎬 Replay Player Available!</h4>
            <p style={{ marginBottom: 0, color: '#155724' }}>
              Click the <strong>"▶ Replay"</strong> button next to any session to watch a full reconstruction
              of the user's interactions. The player includes timeline controls, playback speed adjustment,
              and real-time cursor tracking.
            </p>
          </div>
        </div>
      )}

      {/* Replay Player Modal */}
      {replaySession && (
        <ReplayPlayer
          session={replaySession}
          onClose={() => setReplaySession(null)}
        />
      )}
    </div>
  );
};