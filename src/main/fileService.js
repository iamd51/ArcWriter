import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'

const BIBLE_FILENAME = '.arcbible'

function readDirectoryRecursive(dirPath) {
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true })
        return items
            .filter(item => !item.name.startsWith('.'))
            .sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1
                if (!a.isDirectory() && b.isDirectory()) return 1
                return a.name.localeCompare(b.name, 'zh-Hant')
            })
            .map(item => {
                const itemPath = path.join(dirPath, item.name)
                if (item.isDirectory()) {
                    return {
                        name: item.name,
                        path: itemPath,
                        type: 'directory',
                        children: readDirectoryRecursive(itemPath),
                    }
                }
                return {
                    name: item.name,
                    path: itemPath,
                    type: 'file',
                    extension: path.extname(item.name).toLowerCase(),
                }
            })
    } catch {
        return []
    }
}

export function setupFileHandlers(mainWindow) {
    ipcMain.handle('open-folder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: '選擇專案資料夾',
        })
        if (result.canceled) return null
        const dirPath = result.filePaths[0]
        const tree = readDirectoryRecursive(dirPath)
        return { path: dirPath, name: path.basename(dirPath), tree }
    })

    ipcMain.handle('read-directory', async (_event, dirPath) => {
        return readDirectoryRecursive(dirPath)
    })

    ipcMain.handle('read-file', async (_event, filePath) => {
        try {
            return fs.readFileSync(filePath, 'utf-8')
        } catch {
            return null
        }
    })

    ipcMain.handle('write-file', async (_event, filePath, content) => {
        try {
            fs.writeFileSync(filePath, content, 'utf-8')
            return true
        } catch {
            return false
        }
    })

    ipcMain.handle('create-file', async (_event, dirPath, fileName, initialContent) => {
        try {
            const filePath = path.join(dirPath, fileName)
            if (fs.existsSync(filePath)) return { error: '檔案已存在' }
            fs.writeFileSync(filePath, initialContent || '', 'utf-8')
            return { path: filePath }
        } catch (e) {
            return { error: e.message }
        }
    })

    ipcMain.handle('create-folder', async (_event, dirPath, folderName) => {
        try {
            const folderPath = path.join(dirPath, folderName)
            if (fs.existsSync(folderPath)) return { error: '資料夾已存在' }
            fs.mkdirSync(folderPath, { recursive: true })
            return { path: folderPath }
        } catch (e) {
            return { error: e.message }
        }
    })

    ipcMain.handle('delete-item', async (_event, itemPath) => {
        try {
            await shell.trashItem(itemPath)
            return true
        } catch {
            return false
        }
    })

    ipcMain.handle('rename-item', async (_event, oldPath, newName) => {
        try {
            const dir = path.dirname(oldPath)
            const newPath = path.join(dir, newName)
            fs.renameSync(oldPath, newPath)
            return { path: newPath }
        } catch (e) {
            return { error: e.message }
        }
    })

    ipcMain.handle('save-file-as', async (_event, content, defaultName) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: '另存新檔',
            defaultPath: defaultName || 'untitled.md',
            filters: [
                { name: '小說檔案', extensions: ['md', 'txt'] },
                { name: '劇本檔案', extensions: ['arc'] },
                { name: '所有檔案', extensions: ['*'] },
            ],
        })
        if (result.canceled) return { canceled: true }
        try {
            fs.writeFileSync(result.filePath, content, 'utf-8')
            return { path: result.filePath, name: path.basename(result.filePath) }
        } catch (e) {
            return { error: e.message }
        }
    })

    ipcMain.handle('search-in-project', async (_event, projectPath, query) => {
        const SEARCH_EXTENSIONS = new Set(['.md', '.txt', '.arc', '.json'])
        const results = []

        function searchDir(dirPath) {
            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true })
                for (const item of items) {
                    if (item.name.startsWith('.')) continue
                    const itemPath = path.join(dirPath, item.name)
                    if (item.isDirectory()) {
                        searchDir(itemPath)
                    } else if (SEARCH_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
                        try {
                            const content = fs.readFileSync(itemPath, 'utf-8')
                            const lines = content.split('\n')
                            const matches = []
                            const lowerQuery = query.toLowerCase()
                            lines.forEach((line, idx) => {
                                if (line.toLowerCase().includes(lowerQuery)) {
                                    matches.push({ line: idx + 1, text: line.trim().slice(0, 200) })
                                }
                            })
                            if (matches.length > 0) {
                                results.push({
                                    path: itemPath,
                                    name: item.name,
                                    relativePath: path.relative(projectPath, itemPath),
                                    matches,
                                })
                            }
                        } catch { /* skip unreadable files */ }
                    }
                }
            } catch { /* skip unreadable dirs */ }
        }

        searchDir(projectPath)
        return results
    })

    ipcMain.handle('get-all-files', async (_event, projectPath) => {
        const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.arc', '.json', '.yaml', '.yml'])
        const files = []

        function walkDir(dirPath) {
            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true })
                for (const item of items) {
                    if (item.name.startsWith('.')) continue
                    const itemPath = path.join(dirPath, item.name)
                    if (item.isDirectory()) {
                        walkDir(itemPath)
                    } else if (TEXT_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
                        files.push({
                            path: itemPath,
                            name: item.name,
                            relativePath: path.relative(projectPath, itemPath),
                        })
                    }
                }
            } catch { /* skip */ }
        }

        walkDir(projectPath)
        return files
    })

    // ═══ Story Bible ═══
    ipcMain.handle('read-bible', async (_event, projectPath) => {
        try {
            const filePath = path.join(projectPath, BIBLE_FILENAME)
            if (!fs.existsSync(filePath)) return null
            const raw = fs.readFileSync(filePath, 'utf-8')
            return JSON.parse(raw)
        } catch {
            return null
        }
    })

    ipcMain.handle('write-bible', async (_event, projectPath, data) => {
        try {
            const filePath = path.join(projectPath, BIBLE_FILENAME)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            return true
        } catch {
            return false
        }
    })
}
