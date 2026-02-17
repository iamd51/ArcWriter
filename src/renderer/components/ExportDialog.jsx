import { useState, useCallback } from 'react'
import {
    FileDown, X, FileText, Film, Loader2, Check, AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState } from '../store/useAppStore'
import { parseScreenplayJSON } from './ScreenplayEditor'
import '../styles/export.css'

// ─── Generate screenplay HTML for PDF ───
function generateScreenplayHTML(data, title) {
    const rows = []
    data.scenes.forEach(scene => {
        scene.rows.forEach((row, ri) => {
            if (row.heading) {
                rows.push(`<div class="row heading">${esc(row.heading)}</div>`)
            }
            if (row.character) {
                rows.push(`<div class="row character">${esc(row.character)}</div>`)
            }
            if (row.dialogue) {
                rows.push(`<div class="row dialogue">${esc(stripHtml(row.dialogue))}</div>`)
            }
            if (row.action) {
                rows.push(`<div class="row action">${esc(stripHtml(row.action))}</div>`)
            }
            if (!row.heading && !row.character && !row.dialogue && !row.action) {
                rows.push(`<div class="row blank">&nbsp;</div>`)
            }
        })
    })

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
@page { size: A4; margin: 2.5cm 2cm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1a1a1a;
}
.doc-title {
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    margin-bottom: 2em;
    letter-spacing: 0.1em;
}
.row { margin-bottom: 0.2em; }
.heading {
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 1.5em;
    margin-bottom: 0.4em;
    font-size: 12pt;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2px;
}
.character {
    text-align: center;
    margin-top: 0.8em;
    margin-bottom: 0.1em;
    font-weight: 600;
}
.dialogue {
    margin-left: 2.5cm;
    margin-right: 2.5cm;
    margin-bottom: 0.3em;
}
.action {
    margin-top: 0.4em;
    margin-bottom: 0.4em;
    font-style: italic;
    color: #444;
}
.blank { height: 0.6em; }
</style>
</head>
<body>
<div class="doc-title">${esc(title)}</div>
${rows.join('\n')}
</body>
</html>`
}

// ─── Generate novel HTML for PDF ───
function generateNovelHTML(content, title) {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
@page { size: A4; margin: 2.5cm 2cm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Noto Serif TC', 'Source Han Serif', Georgia, serif;
    font-size: 12pt;
    line-height: 2;
    color: #1a1a1a;
}
.doc-title {
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    margin-bottom: 2em;
    letter-spacing: 0.1em;
}
.content {
    text-indent: 2em;
}
.content p { margin-bottom: 0.5em; text-indent: 2em; }
</style>
</head>
<body>
<div class="doc-title">${esc(title)}</div>
<div class="content">${content}</div>
</body>
</html>`
}

// ─── Generate Fountain format ───
function generateFountain(data, title) {
    const lines = [`Title: ${title}`, '', '===', '']
    data.scenes.forEach(scene => {
        scene.rows.forEach(row => {
            if (row.heading) {
                lines.push(`\n.${row.heading}\n`)
            }
            if (row.character) {
                lines.push(`@${row.character}`)
            }
            if (row.dialogue) {
                lines.push(stripHtml(row.dialogue))
                lines.push('')
            }
            if (row.action) {
                lines.push(`!${stripHtml(row.action)}`)
                lines.push('')
            }
        })
    })
    return lines.join('\n')
}

function esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function stripHtml(str) {
    return (str || '').replace(/<[^>]*>/g, '')
}

// ─── Export Dialog Component ───
export default function ExportDialog({ isOpen, onClose }) {
    const { activeFilePath, openFiles } = useAppState()
    const activeFile = openFiles.find(f => f.path === activeFilePath)
    const ext = activeFilePath?.split('.').pop()?.toLowerCase()
    const isScreenplay = ext === 'arc'
    const fileName = activeFile?.name || activeFilePath?.split(/[\\/]/).pop() || 'untitled'
    const baseName = fileName.replace(/\.[^.]+$/, '')

    const [format, setFormat] = useState(isScreenplay ? 'pdf' : 'pdf')
    const [exporting, setExporting] = useState(false)
    const [result, setResult] = useState(null) // { ok, message }

    const formats = isScreenplay
        ? [
            { id: 'pdf', label: 'PDF', icon: FileDown, desc: '標準劇本排版格式' },
            { id: 'fountain', label: 'Fountain', icon: FileText, desc: '業界通用純文字劇本格式' },
        ]
        : [
            { id: 'pdf', label: 'PDF', icon: FileDown, desc: '排版後的 PDF 文件' },
            { id: 'txt', label: '純文字', icon: FileText, desc: '乾淨的 .txt 匯出' },
        ]

    const handleExport = useCallback(async () => {
        if (!activeFile?.content) return
        setExporting(true)
        setResult(null)

        try {
            if (format === 'pdf') {
                // Generate HTML
                let html
                if (isScreenplay) {
                    const data = parseScreenplayJSON(activeFile.content)
                    if (!data) throw new Error('無法解析劇本數據')
                    html = generateScreenplayHTML(data, baseName)
                } else {
                    html = generateNovelHTML(activeFile.content, baseName)
                }

                // Show save dialog
                const dialogResult = await window.electronAPI.showSaveDialog({
                    title: '匯出 PDF',
                    defaultPath: `${baseName}.pdf`,
                    filters: [{ name: 'PDF', extensions: ['pdf'] }],
                })
                if (dialogResult.canceled) {
                    setExporting(false)
                    return
                }

                // Export
                const pdfResult = await window.electronAPI.exportPDF(html, dialogResult.filePath)
                if (pdfResult.ok) {
                    setResult({ ok: true, message: `PDF 已匯出到 ${dialogResult.filePath}` })
                } else {
                    throw new Error(pdfResult.error)
                }
            } else if (format === 'fountain') {
                const data = parseScreenplayJSON(activeFile.content)
                if (!data) throw new Error('無法解析劇本數據')
                const fountain = generateFountain(data, baseName)

                const dialogResult = await window.electronAPI.showSaveDialog({
                    title: '匯出 Fountain',
                    defaultPath: `${baseName}.fountain`,
                    filters: [{ name: 'Fountain', extensions: ['fountain'] }],
                })
                if (dialogResult.canceled) {
                    setExporting(false)
                    return
                }

                await window.electronAPI.writeFile(dialogResult.filePath, fountain)
                setResult({ ok: true, message: `Fountain 已匯出到 ${dialogResult.filePath}` })
            } else if (format === 'txt') {
                const text = stripHtml(activeFile.content)

                const dialogResult = await window.electronAPI.showSaveDialog({
                    title: '匯出純文字',
                    defaultPath: `${baseName}.txt`,
                    filters: [{ name: '文字檔案', extensions: ['txt'] }],
                })
                if (dialogResult.canceled) {
                    setExporting(false)
                    return
                }

                await window.electronAPI.writeFile(dialogResult.filePath, text)
                setResult({ ok: true, message: `純文字已匯出到 ${dialogResult.filePath}` })
            }
        } catch (err) {
            setResult({ ok: false, message: err.message || '匯出失敗' })
        }
        setExporting(false)
    }, [activeFile, format, isScreenplay, baseName])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="export-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="export-dialog"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="export-dialog__header">
                            <h2 className="export-dialog__title">
                                <FileDown size={18} />
                                匯出文件
                            </h2>
                            <button className="export-dialog__close" onClick={onClose}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="export-dialog__body">
                            <div className="export-dialog__file-info">
                                {isScreenplay ? <Film size={14} /> : <FileText size={14} />}
                                <span>{fileName}</span>
                            </div>

                            {/* Format selection */}
                            <div className="export-dialog__section">
                                <label className="export-dialog__label">匯出格式</label>
                                <div className="export-dialog__formats">
                                    {formats.map(f => (
                                        <button
                                            key={f.id}
                                            className={`export-dialog__format-btn ${format === f.id ? 'export-dialog__format-btn--active' : ''}`}
                                            onClick={() => setFormat(f.id)}
                                        >
                                            <f.icon size={16} />
                                            <div>
                                                <span className="export-dialog__format-name">{f.label}</span>
                                                <span className="export-dialog__format-desc">{f.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Result message */}
                            {result && (
                                <div className={`export-dialog__result ${result.ok ? 'export-dialog__result--ok' : 'export-dialog__result--error'}`}>
                                    {result.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                                    <span>{result.message}</span>
                                </div>
                            )}
                        </div>

                        <div className="export-dialog__footer">
                            <button className="export-dialog__cancel-btn" onClick={onClose}>
                                取消
                            </button>
                            <button
                                className="export-dialog__export-btn"
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <>
                                        <Loader2 size={14} className="spinning" />
                                        匯出中…
                                    </>
                                ) : (
                                    <>
                                        <FileDown size={14} />
                                        匯出
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
