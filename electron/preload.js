const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    listFiles: (folderPath) => ipcRenderer.invoke("list-files", folderPath),
    getHomeDir: () => ipcRenderer.invoke("get-home-dir"),
    deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
    declutter: (folderPath) => ipcRenderer.invoke("declutter", folderPath),
    undoDeclutter: () => ipcRenderer.invoke("undo-declutter"),
    closeApp: () => ipcRenderer.send("close-app"),
});
