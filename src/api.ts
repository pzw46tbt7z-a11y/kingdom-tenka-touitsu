type ApiResponse<T> = { data: T };

async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
  return { data };
}

export const api = {
  get<T>(url: string) { return request<T>(url); },
  post<T = any>(url: string, body: unknown) { return request<T>(url, { method: 'POST', body: JSON.stringify(body) }); },
};

type MessageHandler = (message: any) => void;

function makeConnectionId() { return `web-${Math.random().toString(36).slice(2)}-${Date.now()}`; }

function connect() {
  const connectionId = makeConnectionId();
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/ws?connection_id=${encodeURIComponent(connectionId)}`);
  let handler: MessageHandler | null = null;
  const ready = new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () => reject(new Error('WebSocket connection failed')));
  });
  socket.addEventListener('message', event => {
    try { handler?.(JSON.parse(event.data)); } catch { /* ignore malformed events */ }
  });
  return {
    connectionId,
    ready,
    onMessage(next: MessageHandler) { handler = next; },
    close() { socket.close(); },
  };
}

export const ws = { connect };
