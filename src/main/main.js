import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { setupFileHandlers } from './fileService.js'

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        backgroundColor: '#0e0d0b',
        show: false,
        webPreferences: {
            preload: path.join(__dirname2, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    // Smooth show after ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // Window control IPC
    ipcMain.on('window-minimize', () => mainWindow.minimize())
    ipcMain.on('window-maximize', () => {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
    })
    ipcMain.on('window-close', () => mainWindow.close())
    ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized())

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized-change', true)
    })
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-maximized-change', false)
    })

    // ═══ Save Dialog ═══
    ipcMain.handle('show-save-dialog', async (_event, options) => {
        const result = await dialog.showSaveDialog(mainWindow, options)
        return result
    })

    // ═══ Export PDF ═══
    ipcMain.handle('export-pdf', async (_event, htmlContent, savePath, options = {}) => {
        let printWin = null
        try {
            printWin = new BrowserWindow({
                width: 800,
                height: 1200,
                show: false,
                webPreferences: { contextIsolation: true, nodeIntegration: false },
            })

            await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

            // Wait for content to render
            await new Promise(r => setTimeout(r, 500))

            const pdfData = await printWin.webContents.printToPDF({
                pageSize: options.pageSize || 'A4',
                printBackground: true,
                margins: {
                    marginType: 'custom',
                    top: options.marginTop ?? 1.5,
                    bottom: options.marginBottom ?? 1.5,
                    left: options.marginLeft ?? 2,
                    right: options.marginRight ?? 2,
                },
            })

            fs.writeFileSync(savePath, pdfData)
            return { ok: true, path: savePath }
        } catch (e) {
            return { ok: false, error: e.message }
        } finally {
            if (printWin && !printWin.isDestroyed()) printWin.close()
        }
    })

    // File system handlers
    setupFileHandlers(mainWindow)

    // Load app
    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname2, '../dist/index.html'))
    }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    app.quit()
})
