import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("mindcraftDesktop", {
  boot: () => ipcRenderer.invoke("mindcraft:boot"),
  snapshot: () => ipcRenderer.invoke("mindcraft:snapshot"),
  command: (raw) => ipcRenderer.invoke("mindcraft:command", String(raw)),
  quit: () => ipcRenderer.invoke("mindcraft:quit"),
  onEvent: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("mindcraft:event", handler);
    return () => ipcRenderer.removeListener("mindcraft:event", handler);
  },
});
