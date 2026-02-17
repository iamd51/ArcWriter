import { useState, useCallback, useRef } from 'react'
import { Search, FileText, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/search.css'

/**
 * Cross-file search panel — opens in sidebar when activePanel === 'search'.
 * Uses the searchInProject IPC to recursively search all text files.
 */
export default function SearchPanel() {
    const { project } = useAppState()
    const { openFile } = useAppActions()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [expandedFiles, setExpandedFiles] = useState(new Set())
    const inputRef = useRef(null)

    const handleSearch = useCallback(async () => {
        if (!query.trim() || !project?.path) return
        setSearching(true)
        try {
            const res = await window.electronAPI.searchInProject(project.path, query.trim())
            setResults(res || [])
            // Auto-expand all results
            const expanded = new Set(res?.map(r => r.path) || [])
            setExpandedFiles(expanded)
        } catch {
            setResults([])
        }
        setSearching(false)
    }, [query, project])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
        }
    }, [handleSearch])

    const toggleFile = useCallback((filePath) => {
        setExpandedFiles(prev => {
            const next = new Set(prev)
            if (next.has(filePath)) next.delete(filePath)
            else next.add(filePath)
            return next
        })
    }, [])

    const handleMatchClick = useCallback((filePath, fileName) => {
        openFile(filePath, fileName)
    }, [openFile])

    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

    return (
        <div className="search-panel">
            <div className="search-panel__input-wrap">
                <Search size={13} className="search-panel__icon" />
                <input
                    ref={inputRef}
                    className="search-panel__input"
                    type="text"
                    placeholder="跨檔搜尋… (Enter)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {searching && <Loader2 size={13} className="search-panel__spinner" />}
            </div>

            {results.length > 0 && (
                <div className="search-panel__summary">
                    在 {results.length} 個檔案中找到 {totalMatches} 個結果
                </div>
            )}

            <div className="search-panel__results">
                {results.map(file => (
                    <div key={file.path} className="search-panel__file">
                        <button
                            className="search-panel__file-header"
                            onClick={() => toggleFile(file.path)}
                        >
                            {expandedFiles.has(file.path)
                                ? <ChevronDown size={12} />
                                : <ChevronRight size={12} />
                            }
                            <FileText size={12} className="search-panel__file-icon" />
                            <span className="search-panel__file-name">{file.relativePath}</span>
                            <span className="search-panel__file-count">{file.matches.length}</span>
                        </button>

                        {expandedFiles.has(file.path) && (
                            <div className="search-panel__matches">
                                {file.matches.map((m, i) => (
                                    <button
                                        key={i}
                                        className="search-panel__match"
                                        onClick={() => handleMatchClick(file.path, file.name)}
                                    >
                                        <span className="search-panel__match-line">{m.line}</span>
                                        <span className="search-panel__match-text">
                                            {highlightQuery(m.text, query)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!searching && results.length === 0 && query.trim() && (
                <div className="search-panel__empty">
                    沒有找到匹配的結果
                </div>
            )}
        </div>
    )
}

function highlightQuery(text, query) {
    if (!query) return text
    const parts = []
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    let lastIdx = 0

    let pos = lowerText.indexOf(lowerQuery)
    while (pos !== -1) {
        if (pos > lastIdx) parts.push(<span key={`t${pos}`}>{text.slice(lastIdx, pos)}</span>)
        parts.push(<mark key={`m${pos}`} className="search-panel__highlight">{text.slice(pos, pos + query.length)}</mark>)
        lastIdx = pos + query.length
        pos = lowerText.indexOf(lowerQuery, lastIdx)
    }
    if (lastIdx < text.length) parts.push(<span key={`e${lastIdx}`}>{text.slice(lastIdx)}</span>)

    return parts.length > 0 ? parts : text
}
