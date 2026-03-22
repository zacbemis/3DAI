export {};

declare global {
  interface Window {
    /** Set by `preload.ts` when running inside Electron */
    electronAPI?: {
      masterRequest: (payload: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: string;
      }) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: Uint8Array;
      }>;
    };
  }
}
