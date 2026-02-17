const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    windowMinimize: () => ipcRenderer.send('window-minimize'),
    windowMaximize: () => ipcRenderer.send('window-maximize'),
    windowClose: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximizedChange: (callback) => {
        ipcRenderer.on('window-maximized-change', (_event, value) => callback(value))
    },

    // File system
    openFolder: () => ipcRenderer.invoke('open-folder'),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    createFile: (dirPath, fileName, initialContent) => ipcRenderer.invoke('create-file', dirPath, fileName, initialContent),
    createFolder: (dirPath, folderName) => ipcRenderer.invoke('create-folder', dirPath, folderName),
    deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
    renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', oldPath, newName),
    saveFileAs: (content, defaultName) => ipcRenderer.invoke('save-file-as', content, defaultName),
    searchInProject: (projectPath, query) => ipcRenderer.invoke('search-in-project', projectPath, query),
    getAllFiles: (projectPath) => ipcRenderer.invoke('get-all-files', projectPath),

    // Story Bible
    readBible: (projectPath) => ipcRenderer.invoke('read-bible', projectPath),
    writeBible: (projectPath, data) => ipcRenderer.invoke('write-bible', projectPath, data),
})
