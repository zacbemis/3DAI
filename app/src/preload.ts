import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveTsxComponent: (content: string, filename: string) =>
    ipcRenderer.invoke('save-tsx-component', content, filename),
});
