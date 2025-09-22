interface SessionInfo {
  sessionId: string;
  projectKey: string;
  userId?: string;
  startedAt: number;
  lastActivity: number;
}

class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionInfo | null = null;
  private readonly STORAGE_KEY = 'glassowl_session';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private saveSession(): void {
    if (this.currentSession) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
      } catch (error) {
        console.warn('Failed to save session to localStorage:', error);
      }
    }
  }

  private loadSession(): SessionInfo | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored) as SessionInfo;
        // Check if session is still valid (not expired)
        const now = Date.now();
        if (now - session.lastActivity < this.SESSION_TIMEOUT) {
          return session;
        } else {
          // Session expired, clear it
          this.clearSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
      this.clearSession();
    }
    return null;
  }

  private clearSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error);
    }
  }

  getOrCreateSession(projectKey: string, userId?: string): SessionInfo {
    // Try to load existing session
    let session = this.loadSession();

    // Check if we need a new session (different project/user or expired)
    if (!session || session.projectKey !== projectKey || session.userId !== userId) {
      session = {
        sessionId: this.generateSessionId(),
        projectKey,
        userId,
        startedAt: Date.now(),
        lastActivity: Date.now(),
      };
      console.log('GlassOwl: Created new session:', session.sessionId);
    } else {
      // Update activity timestamp for existing session
      session.lastActivity = Date.now();
      console.log('GlassOwl: Resuming existing session:', session.sessionId);
    }

    this.currentSession = session;
    this.saveSession();
    return session;
  }

  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
      this.saveSession();
    }
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  endSession(): void {
    console.log('GlassOwl: Ending session:', this.currentSession?.sessionId);
    this.clearSession();
    this.currentSession = null;
  }

  // Check if current session is still valid
  isSessionValid(): boolean {
    if (!this.currentSession) return false;
    const now = Date.now();
    return (now - this.currentSession.lastActivity) < this.SESSION_TIMEOUT;
  }
}

export default SessionManager;