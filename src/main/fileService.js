import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

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

    ipcMain.handle('create-project', async (_event, projectName) => {
        // Let user pick where to create the project folder
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: '選擇專案存放位置',
        })
        if (result.canceled) return null

        const parentDir = result.filePaths[0]
        const projectDir = path.join(parentDir, projectName)

        // Check if folder already exists
        if (fs.existsSync(projectDir)) {
            return { error: '此位置已存在同名資料夾' }
        }

        try {
            // Create project root and subdirectories
            fs.mkdirSync(projectDir, { recursive: true })
            fs.mkdirSync(path.join(projectDir, '小說'), { recursive: true })
            fs.mkdirSync(path.join(projectDir, '劇本'), { recursive: true })
            fs.mkdirSync(path.join(projectDir, '筆記'), { recursive: true })

            // Create a welcome README
            const readme = `# ${projectName}\n\n歡迎來到你的創作旅程。\n\n## 資料夾結構\n\n- **小說/** — 小說及散文作品\n- **劇本/** — 劇本檔案 (.arc)\n- **筆記/** — 靈感、筆記、大綱\n\n> 在 ArcWriter 中開始你的故事吧！\n`
            fs.writeFileSync(path.join(projectDir, 'README.md'), readme, 'utf-8')

            const tree = readDirectoryRecursive(projectDir)
            return { path: projectDir, name: projectName, tree }
        } catch (e) {
            return { error: e.message }
        }
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

    // ── Read binary document formats (docx / xlsx / pdf) ──
    ipcMain.handle('read-binary-file', async (_event, filePath) => {
        const ext = path.extname(filePath).toLowerCase()
        try {
            if (ext === '.docx') {
                const buffer = fs.readFileSync(filePath)
                const result = await mammoth.convertToHtml({ buffer })
                return { ok: true, content: result.value, format: 'html' }
            }

            if (ext === '.xlsx' || ext === '.xls') {
                const buffer = fs.readFileSync(filePath)
                const workbook = XLSX.read(buffer, { type: 'buffer' })
                // Convert each sheet to an HTML table
                const sheets = workbook.SheetNames.map(name => {
                    const sheet = workbook.Sheets[name]
                    const html = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${name}` })
                    return `<h2>${name}</h2>\n${html}`
                })
                return { ok: true, content: sheets.join('\n<hr/>\n'), format: 'html' }
            }

            if (ext === '.pdf') {
                // Dynamic import for pdf-parse (CommonJS module)
                const pdfParse = (await import('pdf-parse')).default
                const buffer = fs.readFileSync(filePath)
                const data = await pdfParse(buffer)
                // Convert text to paragraphs
                const html = data.text
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => `<p>${line}</p>`)
                    .join('\n')
                return { ok: true, content: html, format: 'html', pages: data.numpages }
            }

            return { ok: false, error: `不支援的檔案格式: ${ext}` }
        } catch (e) {
            console.error('[read-binary-file] Error:', e)
            return { ok: false, error: e.message }
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

    // ═══ Story Bible Images ═══
    const BIBLE_ASSETS_DIR = '.arcbible-assets'

    ipcMain.handle('pick-bible-image', async (_event, projectPath, entryId) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: '選擇圖片',
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: '圖片檔案', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] },
            ],
        })
        if (result.canceled || result.filePaths.length === 0) return { canceled: true }

        try {
            const assetsDir = path.join(projectPath, BIBLE_ASSETS_DIR, entryId)
            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true })
            }

            const relativePaths = []
            for (const srcPath of result.filePaths) {
                const ext = path.extname(srcPath)
                const destName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
                const destPath = path.join(assetsDir, destName)
                fs.copyFileSync(srcPath, destPath)
                // Store relative path from project root
                relativePaths.push(path.join(BIBLE_ASSETS_DIR, entryId, destName))
            }

            return { ok: true, paths: relativePaths }
        } catch (e) {
            return { ok: false, error: e.message }
        }
    })

    ipcMain.handle('delete-bible-image', async (_event, projectPath, relativePath) => {
        try {
            const fullPath = path.join(projectPath, relativePath)
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath)
            }
            return true
        } catch {
            return false
        }
    })

    ipcMain.handle('resolve-bible-image', async (_event, projectPath, relativePath) => {
        try {
            const fullPath = path.join(projectPath, relativePath)
            if (fs.existsSync(fullPath)) {
                return `file://${fullPath.replace(/\\/g, '/')}`
            }
            return null
        } catch {
            return null
        }
    })

    // ═══ Snapshots (Version History) ═══
    const SNAPSHOTS_DIR = '.snapshots'

    ipcMain.handle('create-snapshot', async (_event, projectPath, filePath, label) => {
        try {
            const fileName = path.basename(filePath)
            const snapshotDir = path.join(projectPath, SNAPSHOTS_DIR, fileName)
            if (!fs.existsSync(snapshotDir)) {
                fs.mkdirSync(snapshotDir, { recursive: true })
            }
            const content = fs.readFileSync(filePath, 'utf-8')
            const timestamp = Date.now()
            const snapshot = { label: label || '', timestamp, fileName, content }
            const snapshotPath = path.join(snapshotDir, `${timestamp}.json`)
            fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8')
            return { ok: true, timestamp, path: snapshotPath }
        } catch (e) {
            return { ok: false, error: e.message }
        }
    })

    ipcMain.handle('list-snapshots', async (_event, projectPath, filePath) => {
        try {
            const fileName = path.basename(filePath)
            const snapshotDir = path.join(projectPath, SNAPSHOTS_DIR, fileName)
            if (!fs.existsSync(snapshotDir)) return []

            const files = fs.readdirSync(snapshotDir)
                .filter(f => f.endsWith('.json'))
                .sort((a, b) => b.localeCompare(a)) // newest first

            return files.map(f => {
                try {
                    const raw = fs.readFileSync(path.join(snapshotDir, f), 'utf-8')
                    const data = JSON.parse(raw)
                    return {
                        path: path.join(snapshotDir, f),
                        timestamp: data.timestamp,
                        label: data.label || '',
                        size: raw.length,
                    }
                } catch {
                    return null
                }
            }).filter(Boolean)
        } catch {
            return []
        }
    })

    ipcMain.handle('read-snapshot', async (_event, snapshotPath) => {
        try {
            const raw = fs.readFileSync(snapshotPath, 'utf-8')
            return JSON.parse(raw)
        } catch {
            return null
        }
    })

    ipcMain.handle('delete-snapshot', async (_event, snapshotPath) => {
        try {
            if (fs.existsSync(snapshotPath)) {
                fs.unlinkSync(snapshotPath)
            }
            return true
        } catch {
            return false
        }
    })
}
