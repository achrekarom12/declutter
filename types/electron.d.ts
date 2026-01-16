export interface FileInfo {
    name: string;
    isDirectory: boolean;
    size: number;
    path: string;
}

export interface ListFilesResult {
    files?: FileInfo[];
    currentPath?: string;
    parentPath?: string;
    error?: string;
}

export interface ElectronAPI {
    listFiles: (folderPath?: string) => Promise<ListFilesResult>;
    getHomeDir: () => Promise<string>;
    deleteFile: (filePath: string) => Promise<{ success?: boolean; error?: string }>;
    renameFile: (filePath: string, newName: string) => Promise<{ success?: boolean; error?: string }>;
    createFolder: (folderPath: string) => Promise<{ success?: boolean; error?: string; newFolderPath?: string; newFolderName?: string }>;
    moveFile: (sourcePath: string, destinationPath: string) => Promise<{ success?: boolean; error?: string }>;
    declutter: (folderPath?: string) => Promise<{ success?: boolean; movedCount?: number; error?: string }>;
    undoDeclutter: () => Promise<{ success?: boolean; undoneCount?: number; error?: string }>;
    closeApp: () => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
