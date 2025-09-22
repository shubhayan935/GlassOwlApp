import { SessionEvent, SessionChunk, DOMSnapshot, GlassOwlConfig } from '../types';
import { generateDVF } from '../dvf/DVFGenerator';
import { uploadChunk } from '../uploader/Uploader';
import SessionManager from '../SessionManager';

export class Recorder {
  private config: GlassOwlConfig;
  private sessionId: string;
  private _isRecording: boolean = false;
  private sessionStartTime: number = 0;
  private currentChunkIdx: number = 0;
  private currentEvents: SessionEvent[] = [];
  private mutationObserver?: MutationObserver;
  private chunkTimer?: number;
  private lastHash?: string;
  private dvf?: string;
  private sessionManager: SessionManager;

  constructor(config: GlassOwlConfig) {
    this.config = {
      endpoint: 'http://localhost:3001/ingest',
      ...config,
    };
    this.sessionManager = SessionManager.getInstance();

    // Get or create persistent session
    const sessionInfo = this.sessionManager.getOrCreateSession(config.apiKey, config.userId);
    this.sessionId = sessionInfo.sessionId;
    this.sessionStartTime = sessionInfo.startedAt;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  // No longer needed - session ID is managed by SessionManager

  async start(): Promise<void> {
    if (this._isRecording) {
      console.log('GlassOwl: Already recording, skipping start');
      return;
    }

    console.log('GlassOwl: Starting recording...', { sessionId: this.sessionId });

    try {
      this._isRecording = true;

      // Check if we're resuming an existing session
      const currentSession = this.sessionManager.getCurrentSession();
      if (currentSession && this.sessionManager.isSessionValid()) {
        console.log('GlassOwl: Resuming existing session');
        // For resumed sessions, we need to determine the next chunk index
        // This would ideally come from the server, but for now we'll continue incrementally
        this.currentChunkIdx = 0; // Reset for this recording instance
      } else {
        console.log('GlassOwl: Starting fresh session');
        this.currentChunkIdx = 0;
      }

      this.currentEvents = [];

      // Generate DVF and capture initial snapshot
      console.log('GlassOwl: Initializing session...');
      await this.initializeSession();

      // Start event listeners
      console.log('GlassOwl: Setting up event listeners...');
      this.setupEventListeners();

      // Start chunk timer
      console.log('GlassOwl: Starting chunk timer...');
      this.startChunkTimer();

      console.log('GlassOwl recording started successfully', { sessionId: this.sessionId, dvf: this.dvf });
    } catch (error) {
      console.error('GlassOwl: Failed to start recording:', error);
      this._isRecording = false;
    }
  }

  private async initializeSession(): Promise<void> {
    try {
      // Generate DVF first
      console.log('GlassOwl: Generating DVF...');
      this.dvf = await generateDVF();
      console.log('GlassOwl: DVF generated:', this.dvf);

      // Capture initial DOM snapshot
      console.log('GlassOwl: Capturing initial snapshot...');
      const snapshot = this.captureSnapshot();
      console.log('GlassOwl: Snapshot captured, size:', snapshot.html.length);

      // Create keyframe chunk
      console.log('GlassOwl: Creating keyframe chunk...');
      await this.createChunk(true, snapshot);
      console.log('GlassOwl: Keyframe chunk created');
    } catch (error) {
      console.error('GlassOwl: Failed to initialize session:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Mouse tracking
    let mouseThrottle: number | null = null;
    document.addEventListener('mousemove', (e) => {
      if (mouseThrottle) return;
      mouseThrottle = window.setTimeout(() => {
        this.addEvent({
          t: 'mouse',
          x: e.clientX,
          y: e.clientY,
          ts: this.getRelativeTimestamp(),
        });
        mouseThrottle = null;
      }, 50); // 20Hz
    });

    // Click tracking
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      this.addEvent({
        t: 'click',
        x: e.clientX,
        y: e.clientY,
        ts: this.getRelativeTimestamp(),
        el: {
          tag: target.tagName,
          id: target.id || undefined,
          className: target.className || undefined,
        },
      });
    });

    // Scroll tracking
    let scrollThrottle: number | null = null;
    document.addEventListener('scroll', () => {
      if (scrollThrottle) return;
      scrollThrottle = window.setTimeout(() => {
        this.addEvent({
          t: 'scroll',
          x: window.scrollX,
          y: window.scrollY,
          ts: this.getRelativeTimestamp(),
        });
        scrollThrottle = null;
      }, 100); // 10Hz
    });

    // Mutation observer
    this.mutationObserver = new MutationObserver((mutations) => {
      try {
        const ops = mutations.map((mutation) => {
          try {
            const op: any = {
              type: mutation.type,
              target: mutation.target instanceof Element ? this.getElementPath(mutation.target) :
                     mutation.target instanceof Text ? this.getTextNodePath(mutation.target) : 'non-element',
              addedNodes: Array.from(mutation.addedNodes).map(node => this.serializeNode(node)).filter(n => n),
              removedNodes: Array.from(mutation.removedNodes).map(node => this.serializeNode(node)).filter(n => n),
              attributeName: mutation.attributeName,
              oldValue: mutation.oldValue,
            };

            // Capture new values for different mutation types
            if (mutation.type === 'attributes' && mutation.target instanceof Element) {
              op.newValue = mutation.target.getAttribute(mutation.attributeName!);
            } else if (mutation.type === 'characterData' && mutation.target instanceof Text) {
              op.newValue = mutation.target.textContent;
            }

            return op;
          } catch (err) {
            console.warn('Failed to process mutation:', err);
            return {
              type: 'error',
              target: 'unknown',
              addedNodes: [],
              removedNodes: [],
              attributeName: null,
              oldValue: null,
            };
          }
        }).filter(op => op);

        if (ops.length > 0) {
          this.addEvent({
            t: 'mut',
            ops,
            ts: this.getRelativeTimestamp(),
          });
        }
      } catch (err) {
        console.warn('MutationObserver error:', err);
      }
    });

    this.mutationObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });

    // Route changes (basic)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event('routechange'));
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('routechange'));
    };

    window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('routechange'));
    });

    window.addEventListener('routechange', () => {
      this.addEvent({
        t: 'route',
        path: window.location.pathname,
        ts: this.getRelativeTimestamp(),
      });
    });
  }

  private captureSnapshot(): DOMSnapshot {
    const doctype = new XMLSerializer().serializeToString(document.doctype!);
    const html = document.documentElement.outerHTML;
    const css = Array.from(document.styleSheets).map(sheet => {
      try {
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
      } catch {
        return sheet.href || '';
      }
    });

    return {
      doctype,
      html,
      css,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  private getElementPath(element: Element): string {
    const path = [];
    let current: Element | null = element;

    // Safety check
    if (!current || !current.tagName) {
      return 'unknown';
    }

    while (current && current.tagName && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + current.id;
      } else if (current.className && typeof current.className === 'string') {
        selector += '.' + current.className.split(' ').filter(c => c).join('.');
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ') || 'root';
  }

  private getTextNodePath(textNode: Text): string {
    if (!textNode.parentElement) {
      return 'orphaned-text';
    }

    const parentPath = this.getElementPath(textNode.parentElement);
    const siblings = Array.from(textNode.parentElement.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
    const index = siblings.indexOf(textNode);

    return `${parentPath}::text[${index}]`;
  }

  private serializeNode(node: Node): any {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      return {
        type: 'element',
        tag: element.tagName,
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {} as Record<string, string>),
        // Capture inner text for elements that might have dynamic content
        innerText: element.innerText || undefined,
        path: this.getElementPath(element),
      };
    } else if (node.nodeType === Node.TEXT_NODE) {
      return {
        type: 'text',
        content: node.textContent,
        path: this.getTextNodePath(node),
      };
    } else if (node.nodeType === Node.COMMENT_NODE) {
      return {
        type: 'comment',
        content: node.textContent,
      };
    }
    return { type: 'unknown' };
  }

  private addEvent(event: SessionEvent): void {
    this.currentEvents.push(event);
    // Update session activity
    this.sessionManager.updateActivity();
  }

  private getRelativeTimestamp(): number {
    return Date.now() - this.sessionStartTime;
  }

  private startChunkTimer(): void {
    this.chunkTimer = window.setTimeout(() => {
      if (this._isRecording) {
        this.createChunk(false);
        this.startChunkTimer();
      }
    }, 5000); // 5 second chunks
  }

  private async createChunk(hasSnapshot: boolean, snapshot?: DOMSnapshot): Promise<void> {
    const events = hasSnapshot && snapshot ?
      [{ t: 'snapshot', snapshot, ts: 0 }, ...this.currentEvents] :
      [...this.currentEvents];

    const chunkData = JSON.stringify(events);
    const hash = await this.hashString(chunkData);

    const chunk: SessionChunk = {
      sessionId: this.sessionId,
      projectKey: this.config.apiKey,
      idx: this.currentChunkIdx,
      startTs: this.currentChunkIdx === 0 ? 0 : this.getRelativeTimestamp() - 5000,
      endTs: this.getRelativeTimestamp(),
      hasSnapshot,
      hash,
      prevHash: this.lastHash,
      designVersion: {
        dvf: this.dvf!,
      },
      user: this.config.userId ? { id: this.config.userId } : undefined,
      events,
    };

    // Upload chunk
    try {
      await uploadChunk(chunk, this.config.endpoint!);
      console.log('Chunk uploaded:', { idx: this.currentChunkIdx, events: events.length });
    } catch (error) {
      console.error('Failed to upload chunk:', error);
    }

    // Reset for next chunk
    this.lastHash = hash;
    this.currentChunkIdx++;
    this.currentEvents = [];
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  stop(endSession: boolean = false): void {
    if (!this._isRecording) return;

    this._isRecording = false;

    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = undefined;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    // Upload final chunk if there are pending events
    if (this.currentEvents.length > 0) {
      this.createChunk(false);
    }

    // Only end the session if explicitly requested (e.g., user leaves site)
    if (endSession) {
      this.sessionManager.endSession();
      console.log('GlassOwl recording stopped and session ended');
    } else {
      console.log('GlassOwl recording stopped (session continues)');
    }
  }
}