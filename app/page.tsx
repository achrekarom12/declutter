"use client";

import { useState, useEffect, useTransition } from "react";
import { FileInfo } from "../types/electron";

export default function Home() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const Breadcrumbs = () => {
    const parts = currentPath.split("/").filter(Boolean);
    return (
      <div className="flex items-center gap-1 text-xs text-zinc-400 overflow-hidden whitespace-nowrap">
        <button
          onClick={() => loadFolder("/")}
          className="hover:text-white transition-colors"
        >
          Root
        </button>
        {parts.map((part, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span>/</span>
            <button
              onClick={() => {
                const path = "/" + parts.slice(0, idx + 1).join("/");
                loadFolder(path);
              }}
              className="hover:text-white transition-colors truncate max-w-[100px]"
            >
              {part}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="flex flex-col h-screen p-6 pt-12 overflow-hidden">
      <div className="titlebar justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest opacity-70">Declutter</span>
          <Breadcrumbs />
        </div>
        <button
          onClick={() => window.electron.closeApp()}
          className="no-drag p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-500 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4 h-full glass-panel p-6 overflow-hidden">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              disabled={!parentPath || parentPath === currentPath}
              className="p-2 hover:bg-white/10 rounded-full disabled:opacity-20 disabled:hover:bg-transparent transition-all no-drag text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-light tracking-tight text-white/90 truncate max-w-[200px]">
              {currentPath.split("/").pop() || "Root"}
            </h1>
          </div>

          <div className="flex items-center gap-3 no-drag">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-[200px] placeholder:text-zinc-600"
              />
            </div>
            <div className="text-[10px] text-zinc-500 font-mono bg-white/5 px-2 py-1 rounded">
              {searchQuery ? `${filteredFiles.length} of ${files.length}` : `${files.length} items`}
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg no-drag">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col no-drag">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5">
            <div className="col-span-7">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Size</div>
            <div className="col-span-1 text-right">Action</div>
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
              <ul className="flex flex-col gap-1">
                {filteredFiles.map((file, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleFolderClick(file)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group cursor-default ${file.isDirectory ? 'cursor-pointer' : ''}`}
                  >
                    <div className="col-span-7 flex items-center gap-3 overflow-hidden">
                      {file.isDirectory ? (
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="text-sm truncate text-white/80 group-hover:text-white transition-colors">
                        {file.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-zinc-500 self-center">
                      {file.isDirectory ? "Folder" : "File"}
                    </div>
                    <div className="col-span-2 text-xs text-zinc-400 self-center text-right font-mono">
                      {formatSize(file.size)}
                    </div>
                    <div className="col-span-1 flex justify-end items-center">
                      <button
                        onClick={(e) => handleDelete(e, file)}
                        className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
