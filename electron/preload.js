const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    listFiles: (folderPath) => ipcRenderer.invoke("list-files", folderPath),
    getHomeDir: () => ipcRenderer.invoke("get-home-dir"),
    deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
    renameFile: (filePath, newName) => ipcRenderer.invoke("rename-file", filePath, newName),
    declutter: (folderPath) => ipcRenderer.invoke("declutter", folderPath),
    undoDeclutter: () => ipcRenderer.invoke("undo-declutter"),
    closeApp: () => ipcRenderer.send("close-app"),
});
