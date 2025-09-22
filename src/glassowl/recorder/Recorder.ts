import { SessionEvent, SessionChunk, DOMSnapshot, GlassOwlConfig } from '../types';
import { generateDVF } from '../dvf/DVFGenerator';
import { uploadChunk } from '../uploader/Uploader';

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

  constructor(config: GlassOwlConfig) {
    this.config = {
      endpoint: 'http://localhost:3001/ingest',
      ...config,
    };
    this.sessionId = this.generateSessionId();
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async start(): Promise<void> {
    if (this._isRecording) {
      console.log('GlassOwl: Already recording, skipping start');
      return;
    }

    console.log('GlassOwl: Starting recording...', { sessionId: this.sessionId });

    try {
      this._isRecording = true;
      this.sessionStartTime = Date.now();
      this.currentChunkIdx = 0;
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
      const ops = mutations.map((mutation) => ({
        type: mutation.type,
        target: this.getElementPath(mutation.target as Element),
        addedNodes: Array.from(mutation.addedNodes).map(node => this.serializeNode(node)),
        removedNodes: Array.from(mutation.removedNodes).map(node => this.serializeNode(node)),
        attributeName: mutation.attributeName,
        oldValue: mutation.oldValue,
      }));

      this.addEvent({
        t: 'mut',
        ops,
        ts: this.getRelativeTimestamp(),
      });
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
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + current.id;
      } else if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
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
      };
    } else if (node.nodeType === Node.TEXT_NODE) {
      return {
        type: 'text',
        content: node.textContent,
      };
    }
    return { type: 'unknown' };
  }

  private addEvent(event: SessionEvent): void {
    this.currentEvents.push(event);
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

  stop(): void {
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

    console.log('GlassOwl recording stopped');
  }
}