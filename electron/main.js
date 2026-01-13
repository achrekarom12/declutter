const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const HOME_DIR = os.homedir();
const isDev = process.env.NODE_ENV === "development";

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        transparent: true,
        frame: false,
        vibrancy: 'under-window',
        visualEffectState: 'active',
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.loadURL(isDev ? "http://localhost:3000" : `file://${path.join(__dirname, '../out/index.html')}`);
}

ipcMain.handle("get-home-dir", () => HOME_DIR);

ipcMain.handle("list-files", async (event, folderPath) => {
    try {
        const targetPath = folderPath || HOME_DIR;
        const files = await fs.promises.readdir(targetPath, { withFileTypes: true });

        const fileList = files.map(file => {
            const fullPath = path.join(targetPath, file.name);
            let size = 0;
            try {
                const stats = fs.statSync(fullPath);
                if (file.isFile()) {
                    size = stats.size;
                }
            } catch (e) {
                // Ignore stat errors for restricted files
            }
            return {
                name: file.name,
                isDirectory: file.isDirectory(),
                size: size,
                path: fullPath
            };
        });

        return {
            currentPath: targetPath,
            parentPath: path.dirname(targetPath),
            files: fileList.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory ? -1 : 1;
            })
        };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle("delete-file", async (event, filePath) => {
    try {
        await fs.promises.rm(filePath, { recursive: true, force: true });
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.on("close-app", () => {
    app.quit();
});



app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});