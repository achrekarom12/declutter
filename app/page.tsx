"use client";

import { useState, useEffect, useTransition } from "react";
import { FileInfo } from "../types/electron";
import { useTheme } from "next-themes";
import { Sun, Moon, Search, Folder, File, Trash2, Edit3, X, ChevronLeft, HardDrive, LayoutGrid } from "lucide-react";

export default function Home() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showUndo, setShowUndo] = useState(false);
  const [movedCount, setMovedCount] = useState(0);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const { theme, setTheme } = useTheme();

  const loadFolder = async (path?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await window.electron.listFiles(path);
        if (result.error) {
          setError(result.error);
        } else {
          setFiles(result.files || []);
          setCurrentPath(result.currentPath || "");
          setParentPath(result.parentPath || null);
          setSearchQuery("");
        }
      } catch (err) {
        setError("Failed to load folder.");
        console.error(err);
      }
    });
  };

  useEffect(() => {
    const init = async () => {
      const home = await window.electron.getHomeDir();
      loadFolder(home);
    };
    init();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  };

  const handleBack = () => {
    if (parentPath && parentPath !== currentPath) {
      loadFolder(parentPath);
    }
  };

  const handleFolderClick = (file: FileInfo) => {
    if (file.isDirectory) {
      loadFolder(file.path);
    }
  };

  const handleDelete = async (e: React.MouseEvent, file: FileInfo) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      const result = await window.electron.deleteFile(file.path);
      if (result.error) {
        setError(result.error);
      } else {
        loadFolder(currentPath);
      }
    }
  };

  const handleRename = async (file: FileInfo) => {
    if (!newName || newName === file.name) {
      setRenamingFile(null);
      return;
    }

    const result = await window.electron.renameFile(file.path, newName);
    if (result.error) {
      setError(result.error);
    } else {
      setRenamingFile(null);
      loadFolder(currentPath);
    }
  };

  const startRenaming = (e: React.MouseEvent, file: FileInfo) => {
    e.stopPropagation();
    setRenamingFile(file.path);
    setNewName(file.name);
  };

  const handleDeclutter = async () => {
    setError(null);
    const result = await window.electron.declutter(currentPath);
    if (result.error) {
      setError(result.error);
    } else if (result.movedCount && result.movedCount > 0) {
      setMovedCount(result.movedCount);
      setShowUndo(true);
      loadFolder(currentPath);
      // Auto-hide undo after 10 seconds
      setTimeout(() => setShowUndo(false), 10000);
    } else {
      setError("No files to declutter in this folder.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUndo = async () => {
    setError(null);
    const result = await window.electron.undoDeclutter();
    if (result.error) {
      setError(result.error);
    } else {
      setShowUndo(false);
      loadFolder(currentPath);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const Breadcrumbs = () => {
    const parts = currentPath.split("/").filter(Boolean);
    return (
      <div className="flex items-center gap-1 text-xs text-zinc-500 overflow-hidden whitespace-nowrap">
        <button
          onClick={() => loadFolder("/")}
          className="px-2 py-1 hover:bg-hover rounded-md transition-all flex items-center gap-1.5"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Root</span>
        </button>
        {parts.map((part, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="opacity-40">/</span>
            <button
              onClick={() => {
                const path = "/" + parts.slice(0, idx + 1).join("/");
                loadFolder(path);
              }}
              className="px-2 py-1 hover:bg-hover rounded-md transition-all truncate max-w-[120px]"
            >
              {part}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-background text-foreground relative">
      <div className="titlebar justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-500" />
            <span className="text-md font-bold tracking-widest opacity-80 dark:opacity-70">DECLUTTER.io</span>
          </div>
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-2 no-drag">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 hover:bg-hover rounded-md transition-colors text-zinc-500 hover:text-foreground"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => window.electron.closeApp()}
            className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors text-zinc-500 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-6 pt-16 overflow-hidden">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              disabled={!parentPath || parentPath === currentPath}
              className="p-2 hover:bg-hover rounded-full disabled:opacity-20 disabled:hover:bg-transparent transition-all no-drag text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-light tracking-tight text-foreground/90 truncate max-w-[200px]">
              {currentPath.split("/").pop() || "Root"}
            </h1>
          </div>

          <div className="flex items-center gap-3 no-drag">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="bg-card dark:bg-card border border-border-dim rounded-full pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-[240px] placeholder:text-zinc-500"
              />
            </div>
            <div className="text-[10px] text-zinc-500 font-mono bg-card px-2.5 py-1.5 rounded-full border border-border-dim">
              {searchQuery ? `${filteredFiles.length} of ${files.length}` : `${files.length} items`}
            </div>
            <button
              onClick={handleDeclutter}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-full transition-all shadow-lg shadow-blue-500/20"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Declutter
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg no-drag">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col no-drag">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-card border border-border-dim rounded-xl">
            <div className="col-span-7">Name</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2 text-right">Size</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2">
            {isPending ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm">{searchQuery ? "No matches found" : "Folder is empty"}</span>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredFiles.map((file, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleFolderClick(file)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl hover:bg-hover border border-transparent hover:border-border-dim transition-all group cursor-default ${file.isDirectory ? 'cursor-pointer' : ''}`}
                  >
                    <div className="col-span-7 flex items-center gap-3 overflow-hidden">
                      {file.isDirectory ? (
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 flex-shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-card text-zinc-500 flex-shrink-0">
                          <File className="w-4 h-4" />
                        </div>
                      )}
                      {renamingFile === file.path ? (
                        <input
                          autoFocus
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(file);
                            if (e.key === "Escape") setRenamingFile(null);
                          }}
                          onBlur={() => handleRename(file)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-card border border-border-dim rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
                        />
                      ) : (
                        <span className="text-sm font-medium truncate text-foreground/80 group-hover:text-foreground transition-colors">
                          {file.name}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-xs text-zinc-500 self-center">
                      {file.isDirectory ? "Folder" : "File"}
                    </div>
                    <div className="col-span-2 text-xs text-zinc-400 self-center text-right font-mono">
                      {formatSize(file.size)}
                    </div>
                    <div className="col-span-2 flex justify-end items-center gap-1.5">
                      <button
                        onClick={(e) => startRenaming(e, file)}
                        className="p-2 hover:bg-hover text-zinc-500 hover:text-foreground rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Rename"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, file)}
                        className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {
        showUndo && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-4 bg-background border border-black/5 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-8 duration-500 no-drag z-50 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Folder Decluttered</span>
              <span className="text-[10px] text-zinc-500">Moved {movedCount} files into categories</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUndo(false)}
                className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-foreground transition-colors uppercase tracking-widest"
              >
                Dismiss
              </button>
              <button
                onClick={handleUndo}
                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
              >
                Undo
              </button>
            </div>
          </div>
        )
      }
    </main >
  );
}
