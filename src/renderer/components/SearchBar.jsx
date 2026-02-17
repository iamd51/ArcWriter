import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ChevronDown, ChevronUp, Replace, ReplaceAll } from 'lucide-react'
import '../styles/search.css'

/**
 * Inline search bar — appears at top of editor area.
 * Ctrl+F to open (search), Ctrl+H to open (replace).
 * Works with TipTap editor for novel mode.
 */
export default function SearchBar({ editor, visible, onClose, showReplace: initialReplace }) {
    const [query, setQuery] = useState('')
    const [replaceText, setReplaceText] = useState('')
    const [showReplace, setShowReplace] = useState(initialReplace || false)
    const [matchCount, setMatchCount] = useState(0)
    const [currentMatch, setCurrentMatch] = useState(0)
    const inputRef = useRef(null)

    // Focus input when opening
    useEffect(() => {
        if (visible && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [visible])

    // Sync initial replace state
    useEffect(() => {
        if (initialReplace) setShowReplace(true)
    }, [initialReplace])

    // Search in TipTap editor
    useEffect(() => {
        if (!editor || !visible) return

        if (!query) {
            // Clear highlights
            try {
                editor.commands.setSearchTerm?.('')
            } catch { /* extension may not be loaded */ }
            setMatchCount(0)
            setCurrentMatch(0)
            return
        }

        // Use browser native find or manual search
        const content = editor.getText()
        const lowerContent = content.toLowerCase()
        const lowerQuery = query.toLowerCase()
        let count = 0
        let pos = 0
        while ((pos = lowerContent.indexOf(lowerQuery, pos)) !== -1) {
            count++
            pos += lowerQuery.length
        }
        setMatchCount(count)
        if (count > 0 && currentMatch === 0) setCurrentMatch(1)
        if (count === 0) setCurrentMatch(0)

        // Highlight using window.find (browser API)
        if (query.length > 0) {
            window.getSelection()?.removeAllRanges()
            // Use TipTap's built-in search if available
            try {
                editor.commands.setSearchTerm?.(query)
            } catch { /* ignore */ }
        }
    }, [query, editor, visible])

    const handleNext = useCallback(() => {
        if (!query) return
        // Use browser find API
        window.find(query, false, false, true, false, false, false)
        setCurrentMatch(prev => prev < matchCount ? prev + 1 : 1)
    }, [query, matchCount])

    const handlePrev = useCallback(() => {
        if (!query) return
        window.find(query, false, true, true, false, false, false)
        setCurrentMatch(prev => prev > 1 ? prev - 1 : matchCount)
    }, [query, matchCount])

    const handleReplace = useCallback(() => {
        if (!editor || !query) return
        const sel = window.getSelection()
        if (sel && sel.toString().toLowerCase() === query.toLowerCase()) {
            document.execCommand('insertText', false, replaceText)
            setMatchCount(prev => Math.max(0, prev - 1))
        }
        // Find next
        handleNext()
    }, [editor, query, replaceText, handleNext])

    const handleReplaceAll = useCallback(() => {
        if (!editor || !query) return
        const content = editor.getHTML()
        // Simple text replacement (preserving HTML structure)
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const newContent = content.replace(regex, replaceText)
        editor.commands.setContent(newContent)
        setMatchCount(0)
        setCurrentMatch(0)
    }, [editor, query, replaceText])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) handlePrev()
            else handleNext()
        } else if (e.key === 'h' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            setShowReplace(prev => !prev)
        }
    }, [onClose, handleNext, handlePrev])

    if (!visible) return null

    return (
        <div className="search-bar" onKeyDown={handleKeyDown}>
            <div className="search-bar__row">
                <div className="search-bar__input-wrap">
                    <Search size={13} className="search-bar__icon" />
                    <input
                        ref={inputRef}
                        className="search-bar__input"
                        type="text"
                        placeholder="搜尋…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <span className="search-bar__count">
                            {matchCount > 0 ? `${currentMatch}/${matchCount}` : '無結果'}
                        </span>
                    )}
                </div>

                <button className="search-bar__btn" onClick={handlePrev} title="上一個 Shift+Enter">
                    <ChevronUp size={14} />
                </button>
                <button className="search-bar__btn" onClick={handleNext} title="下一個 Enter">
                    <ChevronDown size={14} />
                </button>
                <button
                    className="search-bar__btn"
                    onClick={() => setShowReplace(p => !p)}
                    title="展開取代 Ctrl+H"
                >
                    <Replace size={13} />
                </button>
                <button className="search-bar__btn search-bar__btn--close" onClick={onClose} title="關閉 Esc">
                    <X size={14} />
                </button>
            </div>

            {showReplace && (
                <div className="search-bar__row search-bar__replace-row">
                    <div className="search-bar__input-wrap">
                        <Replace size={13} className="search-bar__icon" />
                        <input
                            className="search-bar__input"
                            type="text"
                            placeholder="取代為…"
                            value={replaceText}
                            onChange={(e) => setReplaceText(e.target.value)}
                        />
                    </div>
                    <button className="search-bar__btn" onClick={handleReplace} title="取代">
                        <Replace size={13} />
                    </button>
                    <button className="search-bar__btn" onClick={handleReplaceAll} title="全部取代">
                        <ReplaceAll size={13} />
                    </button>
                </div>
            )}
        </div>
    )
}
