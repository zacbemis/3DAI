import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  masterRequest: (payload: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) => ipcRenderer.invoke('master:request', payload),
});
