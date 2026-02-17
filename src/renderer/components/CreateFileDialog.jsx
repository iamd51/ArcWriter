import { useState, useCallback, useEffect } from 'react'
import { X, BookOpen, Clapperboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/dialog.css'

export default function CreateFileDialog({ isOpen, onClose, onCreateFile, currentDir, initialMode }) {
    const [fileName, setFileName] = useState('')
    const [mode, setMode] = useState(initialMode || 'novel') // 'novel' | 'screenplay'

    // Sync mode when dialog opens with a specific initialMode
    useEffect(() => {
        if (isOpen && initialMode) setMode(initialMode)
    }, [isOpen, initialMode])

    const handleCreate = useCallback(async () => {
        if (!fileName.trim()) return
        const ext = mode === 'screenplay' ? '.arc' : '.md'
        const fullName = fileName.endsWith(ext) ? fileName : fileName + ext

        let initialContent = ''
        if (mode === 'screenplay') {
            initialContent = JSON.stringify({
                format: 'screenplay',
                version: 1,
                scenes: [{
                    scene: 1,
                    rows: [{ heading: '', character: '', dialogue: '', action: '', notes: '' }],
                }],
            }, null, 2)
        }

        await onCreateFile(currentDir, fullName, initialContent)
        setFileName('')
        setMode('novel')
        onClose()
    }, [fileName, mode, onCreateFile, currentDir, onClose])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') handleCreate()
        if (e.key === 'Escape') onClose()
    }, [handleCreate, onClose])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                className="dialog-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="dialog"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="dialog__header">
                        <h3 className="dialog__title">新增檔案</h3>
                        <button className="dialog__close" onClick={onClose}>
                            <X size={14} />
                        </button>
                    </div>

                    <div className="dialog__body">
                        {/* Mode selector */}
                        <div className="dialog__mode-group">
                            <button
                                className={`dialog__mode-btn ${mode === 'novel' ? 'dialog__mode-btn--active' : ''}`}
                                onClick={() => setMode('novel')}
                            >
                                <BookOpen size={18} />
                                <span className="dialog__mode-label">小說模式</span>
                                <span className="dialog__mode-desc">連續書寫，Markdown 排版</span>
                            </button>
                            <button
                                className={`dialog__mode-btn ${mode === 'screenplay' ? 'dialog__mode-btn--active' : ''}`}
                                onClick={() => setMode('screenplay')}
                            >
                                <Clapperboard size={18} />
                                <span className="dialog__mode-label">劇本模式</span>
                                <span className="dialog__mode-desc">表格欄位，結構化編輯</span>
                            </button>
                        </div>

                        {/* File name */}
                        <div className="dialog__input-group">
                            <label className="dialog__label">檔案名稱</label>
                            <div className="dialog__input-wrap">
                                <input
                                    className="dialog__input"
                                    type="text"
                                    value={fileName}
                                    onChange={e => setFileName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={mode === 'screenplay' ? '例：第一幕' : '例：第一章'}
                                    autoFocus
                                />
                                <span className="dialog__ext">{mode === 'screenplay' ? '.arc' : '.md'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="dialog__footer">
                        <button className="dialog__btn dialog__btn--cancel" onClick={onClose}>
                            取消
                        </button>
                        <button
                            className="dialog__btn dialog__btn--primary"
                            onClick={handleCreate}
                            disabled={!fileName.trim()}
                        >
                            建立
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
