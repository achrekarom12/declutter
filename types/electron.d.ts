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
    closeApp: () => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
