import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, Clapperboard, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/commandpalette.css'

/**
 * Command Palette (Ctrl+P) — fuzzy search all project files.
 * Type to filter, arrow keys to navigate, Enter to open.
 */
export default function CommandPalette({ isOpen, onClose }) {
    const { project } = useAppState()
    const { openFile } = useAppActions()
    const [query, setQuery] = useState('')
    const [files, setFiles] = useState([])
    const [filtered, setFiltered] = useState([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef(null)
    const listRef = useRef(null)

    // Load all files when opening
    useEffect(() => {
        if (isOpen && project?.path) {
            setQuery('')
            setSelectedIndex(0)
            window.electronAPI.getAllFiles(project.path).then(f => {
                setFiles(f || [])
                setFiltered(f || [])
            })
            // Focus input after render
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen, project?.path])

    // Fuzzy filter
    useEffect(() => {
        if (!query.trim()) {
            setFiltered(files)
            setSelectedIndex(0)
            return
        }

        const lowerQ = query.toLowerCase()
        const scored = files
            .map(f => {
                const lowerName = f.name.toLowerCase()
                const lowerPath = f.relativePath.toLowerCase()
                let score = 0

                // Exact name match
                if (lowerName === lowerQ) score = 100
                // Name starts with query
                else if (lowerName.startsWith(lowerQ)) score = 80
                // Name contains query
                else if (lowerName.includes(lowerQ)) score = 60
                // Path contains query
                else if (lowerPath.includes(lowerQ)) score = 40
                // Fuzzy character match on name
                else {
                    let qi = 0
                    for (let i = 0; i < lowerName.length && qi < lowerQ.length; i++) {
                        if (lowerName[i] === lowerQ[qi]) qi++
                    }
                    if (qi === lowerQ.length) score = 20
                }

                return { ...f, score }
            })
            .filter(f => f.score > 0)
            .sort((a, b) => b.score - a.score)

        setFiltered(scored)
        setSelectedIndex(0)
    }, [query, files])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const selected = filtered[selectedIndex]
            if (selected) {
                openFile(selected.path, selected.name)
                onClose()
            }
        }
    }, [filtered, selectedIndex, openFile, onClose])

    // Scroll selected item into view
    useEffect(() => {
        const item = listRef.current?.children[selectedIndex]
        item?.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    const getFileIcon = (name) => {
        const ext = name.split('.').pop()?.toLowerCase()
        if (ext === 'arc') return <Clapperboard size={13} className="cmd-palette__icon cmd-palette__icon--arc" />
        if (ext === 'md' || ext === 'txt') return <BookOpen size={13} className="cmd-palette__icon cmd-palette__icon--md" />
        return <FileText size={13} className="cmd-palette__icon" />
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="cmd-palette__overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="cmd-palette"
                        initial={{ opacity: 0, y: -20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        <div className="cmd-palette__input-wrap">
                            <Search size={14} className="cmd-palette__search-icon" />
                            <input
                                ref={inputRef}
                                className="cmd-palette__input"
                                type="text"
                                placeholder="搜尋檔案… (輸入名稱或路徑)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>

                        <div className="cmd-palette__list" ref={listRef}>
                            {filtered.length === 0 && (
                                <div className="cmd-palette__empty">
                                    沒有找到匹配的檔案
                                </div>
                            )}
                            {filtered.slice(0, 20).map((file, i) => (
                                <button
                                    key={file.path}
                                    className={`cmd-palette__item ${i === selectedIndex ? 'cmd-palette__item--selected' : ''}`}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    onClick={() => {
                                        openFile(file.path, file.name)
                                        onClose()
                                    }}
                                >
                                    {getFileIcon(file.name)}
                                    <span className="cmd-palette__name">{file.name}</span>
                                    <span className="cmd-palette__path">{file.relativePath}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
