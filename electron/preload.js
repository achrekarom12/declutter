const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    listFiles: (folderPath) => ipcRenderer.invoke("list-files", folderPath),
    getHomeDir: () => ipcRenderer.invoke("get-home-dir"),
    deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
    closeApp: () => ipcRenderer.send("close-app"),
});
