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
        transparent: false,
        frame: false,
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

ipcMain.handle("rename-file", async (event, oldPath, newName) => {
    try {
        const dirname = path.dirname(oldPath);
        const newPath = path.join(dirname, newName);
        await fs.promises.rename(oldPath, newPath);
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle("create-folder", async (event, currentPath) => {
    try {
        const targetPath = currentPath || HOME_DIR;
        const baseName = "New Folder";
        let folderName = baseName;
        let counter = 1;
        let finalPath = path.join(targetPath, folderName);

        while (fs.existsSync(finalPath)) {
            folderName = `${baseName} (${counter})`;
            finalPath = path.join(targetPath, folderName);
            counter++;
        }

        await fs.promises.mkdir(finalPath);
        return { success: true, newFolderPath: finalPath, newFolderName: folderName };
    } catch (err) {
        return { error: err.message };
    }
});

const DEFAULT_CATEGORIES = {
    "Documents": [".pdf", ".rtf", ".txt", ".docx", ".xlsx", ".pptx", ".csv", ".pages", ".numbers"],
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".heic", ".svg", ".bmp", ".tiff"],
    "Audio": [".mp3", ".wav", ".m4a", ".flac", ".aac"],
    "Videos": [".mp4", ".mov", ".avi", ".mkv", ".wmv"],
    "Archives": [".zip", ".tar", ".rar", ".7z", ".gz", ".pkg"],
    "Code": [".py", ".js", ".html", ".css", ".java", ".cpp", ".c", ".sh", ".json", ".xml", ".sql", ".md", ".yaml", ".yml"],
    "Design": [".psd", ".ai", ".fig", ".xd", ".sketch", ".indd"],
    "Fonts": [".ttf", ".otf", ".woff", ".woff2"],
    "3D Models": [".stl", ".obj", ".fbx", ".blend", ".step"],
    "Executables": [".exe", ".msi", ".dmg", ".app", ".bin"],
    "Disc Images": [".iso", ".vcd", ".dmg"],
    "Database": [".db", ".sqlite", ".dbf", ".mdb"],
    "E-Books": [".epub", ".mobi", ".azw3", ".kindle"]
};

let lastAction = null;

ipcMain.handle("declutter", async (event, folderPath) => {
    try {
        const targetPath = folderPath || HOME_DIR;
        const files = await fs.promises.readdir(targetPath, { withFileTypes: true });
        const history = [];

        for (const file of files) {
            if (file.isFile()) {
                const ext = path.extname(file.name).toLowerCase();
                let category = null;

                for (const [catName, extensions] of Object.entries(DEFAULT_CATEGORIES)) {
                    if (extensions.includes(ext)) {
                        category = catName;
                        break;
                    }
                }

                if (!category) continue;

                const categoryPath = path.join(targetPath, category);
                if (!fs.existsSync(categoryPath)) {
                    await fs.promises.mkdir(categoryPath);
                }

                const oldPath = path.join(targetPath, file.name);
                const newPath = path.join(categoryPath, file.name);

                // Handle file name collisions
                let finalNewPath = newPath;
                let counter = 1;
                while (fs.existsSync(finalNewPath)) {
                    const extName = path.extname(file.name);
                    const baseName = path.basename(file.name, extName);
                    finalNewPath = path.join(categoryPath, `${baseName} (${counter})${extName}`);
                    counter++;
                }

                await fs.promises.rename(oldPath, finalNewPath);
                history.push({ oldPath, newPath: finalNewPath });
            }
        }

        if (history.length > 0) {
            lastAction = { type: "declutter", history, folderPath: targetPath };
        }

        return { success: true, movedCount: history.length };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle("undo-declutter", async () => {
    if (!lastAction || lastAction.type !== "declutter") {
        return { error: "No action to undo" };
    }

    try {
        for (const move of lastAction.history) {
            if (fs.existsSync(move.newPath)) {
                // Determine the folder to check for emptiness after moving back
                const categoryFolder = path.dirname(move.newPath);

                await fs.promises.rename(move.newPath, move.oldPath);

                // Clean up empty category folder
                try {
                    const remainingFiles = await fs.promises.readdir(categoryFolder);
                    if (remainingFiles.length === 0) {
                        await fs.promises.rmdir(categoryFolder);
                    }
                } catch (e) {
                    // Ignore errors during folder cleanup
                }
            }
        }

        const undoneCount = lastAction.history.length;
        lastAction = null;
        return { success: true, undoneCount };
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