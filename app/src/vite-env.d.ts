/// <reference types="vite/client" />

interface ElectronAPI {
  saveTsxComponent: (
    content: string,
    filename: string,
  ) => Promise<{ success: boolean; path: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}