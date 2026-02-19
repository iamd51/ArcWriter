import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Target, Moon, Type, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/focusmode.css'

// Count CJK + ASCII words from content
function countWords(content) {
    if (!content) return 0
    const text = content.replace(/<[^>]*>/g, '')
    // CJK characters count as 1 each, English words count as 1
    const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
    const english = (text.match(/[a-zA-Z]+/g) || []).length
    return cjk + english
}

// Get raw text for display
function getPlainText(content) {
    if (!content) return ''
    try {
        const data = typeof content === 'string' ? JSON.parse(content) : content
        if (data.format === 'screenplay' && (data.scenes || data.pages)) {
            const allScenes = data.pages ? data.pages.flatMap(p => p.scenes || []) : data.scenes
            const lines = []
            allScenes.forEach(scene => {
                scene.rows?.forEach(row => {
                    const parts = []
                    if (row.heading) parts.push(`[${row.heading}]`)
                    if (row.character) parts.push(row.character + '：')
                    if (row.dialogue) parts.push(row.dialogue.replace(/<[^>]*>/g, ''))
                    if (row.action) parts.push(`（${row.action.replace(/<[^>]*>/g, '')}）`)
                    if (parts.length) lines.push(parts.join(''))
                })
            })
            return lines.join('\n')
        }
    } catch { /* not JSON */ }
    return content.replace(/<[^>]*>/g, '')
}

export default function FocusMode({ isOpen, onClose }) {
    const { activeFilePath, openFiles } = useAppState()
    const { updateContent } = useAppActions()
    const activeFile = openFiles.find(f => f.path === activeFilePath)
    const editorRef = useRef(null)

    const [goal, setGoal] = useState(() => {
        try { return parseInt(localStorage.getItem('arcwriter_focus_goal') || '500') }
        catch { return 500 }
    })
    const [showGoalInput, setShowGoalInput] = useState(false)
    const [startWordCount, setStartWordCount] = useState(0)
    const [currentWordCount, setCurrentWordCount] = useState(0)

    // Initialize word counts on open
    useEffect(() => {
        if (isOpen && activeFile?.content) {
            const count = countWords(activeFile.content)
            setStartWordCount(count)
            setCurrentWordCount(count)
        }
    }, [isOpen])

    // Track word count changes
    useEffect(() => {
        if (isOpen && activeFile?.content) {
            setCurrentWordCount(countWords(activeFile.content))
        }
    }, [activeFile?.content, isOpen])

    // Save goal to localStorage
    const handleSetGoal = useCallback((val) => {
        const num = Math.max(1, parseInt(val) || 500)
        setGoal(num)
        localStorage.setItem('arcwriter_focus_goal', String(num))
        setShowGoalInput(false)
    }, [])

    // Handle editor input
    const handleInput = useCallback(() => {
        if (!editorRef.current || !activeFilePath) return
        const html = editorRef.current.innerHTML
        updateContent(activeFilePath, html)
    }, [activeFilePath, updateContent])

    // Keyboard shortcut to exit
    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isOpen, onClose])

    // Set initial content when opening
    useEffect(() => {
        if (isOpen && editorRef.current && activeFile?.content) {
            const ext = activeFilePath?.split('.').pop()?.toLowerCase()
            if (ext === 'arc') {
                // Screenplay: show read-only view in focus mode
                editorRef.current.innerText = getPlainText(activeFile.content)
                editorRef.current.contentEditable = 'false'
            } else {
                editorRef.current.innerHTML = activeFile.content || ''
                editorRef.current.contentEditable = 'true'
            }
            // Focus to the end
            const range = document.createRange()
            const sel = window.getSelection()
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
            sel.removeAllRanges()
            sel.addRange(range)
        }
    }, [isOpen])

    const wordsWritten = currentWordCount - startWordCount
    const progress = goal > 0 ? Math.min(1, wordsWritten / goal) : 0
    const progressPct = Math.round(progress * 100)

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="focus-mode"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Top bar */}
                    <div className="focus-mode__topbar">
                        <div className="focus-mode__file-info">
                            <Type size={14} />
                            <span>{activeFile?.name || '未開啟文件'}</span>
                        </div>

                        <div className="focus-mode__stats">
                            {/* Word goal */}
                            <div className="focus-mode__goal" onClick={() => setShowGoalInput(!showGoalInput)}>
                                <Target size={13} />
                                <span className="focus-mode__goal-text">
                                    今日：{wordsWritten >= 0 ? '+' : ''}{wordsWritten} / {goal} 字
                                </span>
                                <div className="focus-mode__progress-bar">
                                    <motion.div
                                        className="focus-mode__progress-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPct}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>

                            {showGoalInput && (
                                <div className="focus-mode__goal-input-wrap">
                                    <input
                                        className="focus-mode__goal-input"
                                        type="number"
                                        defaultValue={goal}
                                        placeholder="目標字數"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSetGoal(e.target.value)
                                            if (e.key === 'Escape') setShowGoalInput(false)
                                        }}
                                        onBlur={e => handleSetGoal(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Total word count */}
                            <span className="focus-mode__word-count">
                                {currentWordCount.toLocaleString()} 字
                            </span>
                        </div>

                        <button className="focus-mode__close" onClick={onClose} title="退出專注模式 (Esc)">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Editor area */}
                    <div className="focus-mode__editor-wrap">
                        <div
                            ref={editorRef}
                            className="focus-mode__editor"
                            contentEditable
                            onInput={handleInput}
                            spellCheck={false}
                            data-placeholder="開始寫作…"
                        />
                    </div>

                    {/* Bottom hint */}
                    <div className="focus-mode__hint">
                        按 <kbd>Esc</kbd> 退出專注模式
                    </div>

                    {/* Goal achieved overlay */}
                    <AnimatePresence>
                        {progress >= 1 && wordsWritten > 0 && (
                            <motion.div
                                className="focus-mode__goal-achieved"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            >
                                🎉 目標達成！
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
