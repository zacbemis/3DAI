/**
 * Master service (Express in `services/master`).
 *
 * Defaults to **`http://127.0.0.1:3000`** (not `localhost`, not `/master-api`) so Electron + Forge
 * always hit the real API. A dev-only Vite proxy (`/master-api`) can 404 if Forge doesn’t apply
 * `server.proxy` the same way as `vite` CLI.
 *
 * - Set `VITE_MASTER_API_URL` to override (e.g. remote host).
 * - Set `VITE_MASTER_USE_PROXY=true` **and** keep `vite.renderer.config.ts` proxy to use `/master-api` in dev.
 */
function resolveMasterApiBase(): string {
  const raw = (import.meta.env.VITE_MASTER_API_URL as string | undefined)?.trim();
  if (raw) {
    let base = raw.replace(/\/$/, '');
    // Common mistake: pasting the Vite proxy path into the real API URL
    base = base.replace(/\/master-api\/?$/, '');
    return base || 'http://127.0.0.1:3000';
  }
  const useProxy =
    import.meta.env.DEV && import.meta.env.VITE_MASTER_USE_PROXY === 'true';
  if (useProxy) return '/master-api';
  return 'http://127.0.0.1:3000';
}

export const MASTER_API_BASE = resolveMasterApiBase();

export function masterUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${MASTER_API_BASE}${p}`;
}

function ipcBodyToUint8(body: unknown): Uint8Array {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (Array.isArray(body)) return new Uint8Array(body);
  if (
    body &&
    typeof body === 'object' &&
    'byteLength' in body &&
    typeof (body as ArrayBufferView).byteLength === 'number'
  ) {
    const v = body as ArrayBufferView;
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  return new Uint8Array(0);
}

/**
 * Prefer Electron main-process HTTP (IPC) so `fetch` is not blocked by renderer CORS / PNA.
 * Falls back to `fetch` in a plain browser.
 */
export async function masterFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = masterUrl(path);
  const ipc = typeof window !== 'undefined' ? window.electronAPI : undefined;

  if (ipc?.masterRequest) {
    const method = (init.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (init.headers && typeof init.headers === 'object') {
      for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
        if (typeof v === 'string') headers[k] = v;
      }
    }
    const bodyStr = typeof init.body === 'string' ? init.body : undefined;

    const pending = ipc.masterRequest({
      url,
      method,
      headers,
      body: bodyStr,
    });

    const raw = await (init.signal
      ? Promise.race([
          pending,
          new Promise<never>((_, reject) => {
            init.signal!.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
        ])
      : pending);

    const h = new Headers();
    Object.entries(raw.headers).forEach(([k, v]) => {
      if (v) h.set(k, v);
    });

    const u8 = ipcBodyToUint8(raw.body);
    const blobPart = Uint8Array.from(u8);
    return new Response(new Blob([blobPart]), {
      status: raw.status,
      statusText: raw.statusText,
      headers: h,
    });
  }

  return fetch(url, init);
}

/** Readable error text for failed `fetch` to master (JSON, HTML, or empty). */
export async function readMasterApiError(res: Response): Promise<string> {
  const text = await res.text();
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json') && text.trim()) {
    try {
      const j = JSON.parse(text) as {
        error?: string;
        details?: string;
        hint?: string;
      };
      const msg = [j.error, j.details, j.hint].filter(Boolean).join(' — ');
      if (msg) return msg;
    } catch {
      // fall through
    }
  }
  const t = text.trim();
  if (t) {
    return t.length > 400 ? `${t.slice(0, 400)}…` : t;
  }
  if (res.status === 404) {
    return `No route at ${res.url || 'this URL'} — check master is running and VITE_MASTER_API_URL is not set to a /master-api path.`;
  }
  return res.statusText || `HTTP ${res.status}`;
}
