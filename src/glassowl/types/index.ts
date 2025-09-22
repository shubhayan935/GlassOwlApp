export interface GlassOwlConfig {
  apiKey: string;
  userId?: string;
  endpoint?: string;
}

export interface SessionEvent {
  t: string; // event type
  ts: number; // timestamp relative to session start
  [key: string]: any;
}

export interface MouseEvent extends SessionEvent {
  t: 'mouse';
  x: number;
  y: number;
}

export interface ClickEvent extends SessionEvent {
  t: 'click';
  x: number;
  y: number;
  el?: {
    tag: string;
    id?: string;
    className?: string;
  };
}

export interface ScrollEvent extends SessionEvent {
  t: 'scroll';
  x: number;
  y: number;
}

export interface MutationEvent extends SessionEvent {
  t: 'mut';
  ops: any[]; // mutation operations
}

export interface RouteEvent extends SessionEvent {
  t: 'route';
  path: string;
}

export interface SessionChunk {
  sessionId: string;
  projectKey: string;
  idx: number;
  startTs: number;
  endTs: number;
  hasSnapshot: boolean;
  hash: string;
  prevHash?: string;
  designVersion: {
    dvf: string;
  };
  user?: {
    id: string;
  };
  events: SessionEvent[];
}

export interface DOMSnapshot {
  doctype: string;
  html: string;
  css: string[];
  viewport: {
    width: number;
    height: number;
  };
}