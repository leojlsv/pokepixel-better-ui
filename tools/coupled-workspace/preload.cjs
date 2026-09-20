const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("workspaceApi", {
  getState: () => ipcRenderer.invoke("workspace:get-state"),
  setSplit: (value) => ipcRenderer.send("workspace:set-split", value),
  command: (side, action) => ipcRenderer.send("workspace:command", { side, action }),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("workspace:state", listener);
    return () => ipcRenderer.removeListener("workspace:state", listener);
  },
});
