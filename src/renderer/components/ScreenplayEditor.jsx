import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useAppState, useAppDispatch } from '../store/useAppStore'
import ScreenplayToolbar from './ScreenplayToolbar'
import ScreenplayRow, { COLUMNS } from './ScreenplayRow'
import '../styles/screenplay.css'

function createEmptyRow() {
    return { heading: '', character: '', dialogue: '', action: '', notes: '' }
}

function createEmptyScene(sceneNum) {
    return {
        scene: sceneNum,
        collapsed: false,
        rows: [createEmptyRow()],
    }
}

function createEmptyPage(name) {
    return { name, scenes: [createEmptyScene(1)] }
}

/**
 * Parse a screenplay JSON string with recovery for corrupted data.
 * Exported so AIPanel can reuse it.
 */
export function parseScreenplayJSON(content) {
    if (!content) return null
    const raw = typeof content === 'string' ? content : JSON.stringify(content)

    // Try direct parse first
    try {
        const data = JSON.parse(raw)
        if (data.format === 'screenplay' && data.pages) return data
        // Backward compat: migrate old flat scenes format to pages
        if (data.format === 'screenplay' && data.scenes) {
            return { format: 'screenplay', version: 2, pages: [{ name: '分頁 1', scenes: data.scenes }] }
        }
    } catch {
        // JSON is corrupted — try to recover the first valid JSON object
        try {
            let depth = 0, endIdx = -1
            for (let i = 0; i < raw.length; i++) {
                const ch = raw[i]
                if (ch === '"') {
                    i++
                    while (i < raw.length && raw[i] !== '"') {
                        if (raw[i] === '\\') i++
                        i++
                    }
                    continue
                }
                if (ch === '{') depth++
                if (ch === '}') {
                    depth--
                    if (depth === 0) { endIdx = i; break }
                }
            }
            if (endIdx > 0) {
                const firstJson = raw.slice(0, endIdx + 1)
                const data = JSON.parse(firstJson)
                if (data.format === 'screenplay' && data.pages) {
                    console.warn('[ScreenplayEditor] Recovered corrupted JSON')
                    return data
                }
                if (data.format === 'screenplay' && data.scenes) {
                    console.warn('[ScreenplayEditor] Recovered corrupted JSON (legacy)')
                    return { format: 'screenplay', version: 2, pages: [{ name: '分頁 1', scenes: data.scenes }] }
                }
            }
        } catch { /* recovery also failed */ }
    }
    return null
}

function parseScreenplayData(content) {
    return parseScreenplayJSON(content) || { format: 'screenplay', version: 2, pages: [createEmptyPage('分頁 1')] }
}

export default function ScreenplayEditor({ filePath: overrideFilePath }) {
    const { activeFilePath, openFiles } = useAppState()
    const dispatch = useAppDispatch()
    const filePath = overrideFilePath || activeFilePath

    const activeFile = openFiles.find(f => f.path === filePath)
    const [data, setData] = useState(() => parseScreenplayData(activeFile?.content))
    const [selectedCell, setSelectedCell] = useState(null) // { sceneIndex, rowIndex, colKey }
    const [allCollapsed, setAllCollapsed] = useState(false)
    const [contextMenu, setContextMenu] = useState(null)
    const containerRef = useRef(null)
    const lastFilePath = useRef(filePath)
    const lastPersistedContent = useRef(null)

    // ── Search state ──
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchMatches, setSearchMatches] = useState([]) // [{pageIndex, sceneIndex, rowIndex, colKey}]
    const [matchIndex, setMatchIndex] = useState(0)

    // ── Tab / page state ──
    const [currentPage, setCurrentPage] = useState(0)
    const [tabContextMenu, setTabContextMenu] = useState(null) // { x, y, pageIndex }
    const [sceneContextMenu, setSceneContextMenu] = useState(null) // { x, y, sceneIndex }
    const [confirmDialog, setConfirmDialog] = useState(null) // { message, onConfirm }

    // Derived: current page's scenes
    const currentPageData = data.pages[currentPage] || data.pages[0]
    const scenes = currentPageData?.scenes || []

    // Clamp page index
    useEffect(() => {
        if (currentPage >= data.pages.length) setCurrentPage(Math.max(0, data.pages.length - 1))
    }, [data.pages.length, currentPage])

    // Column widths state (resizable)
    const [columnWidths, setColumnWidths] = useState(() => {
        const widths = {}
        COLUMNS.forEach(col => { widths[col.key] = col.defaultWidth })
        return widths
    })
    const resizeRef = useRef(null)

    // Sync from file when active file changes OR its content is loaded/updated externally
    useEffect(() => {
        if (!activeFile) return
        const fileContent = activeFile.content

        if (filePath !== lastFilePath.current) {
            lastFilePath.current = filePath
            lastPersistedContent.current = fileContent
            setData(parseScreenplayData(fileContent))
            setCurrentPage(0)
            return
        }

        if (fileContent && fileContent !== lastPersistedContent.current) {
            lastPersistedContent.current = fileContent
            setData(parseScreenplayData(fileContent))
        }
    }, [filePath, activeFile?.content])

    // Persist changes back to store
    const persistData = useCallback((newData) => {
        setData(newData)
        if (filePath) {
            const json = JSON.stringify({
                format: 'screenplay',
                version: 2,
                pages: newData.pages.map(p => ({
                    name: p.name,
                    scenes: p.scenes.map(s => ({
                        scene: s.scene,
                        rows: s.rows,
                    })),
                })),
            }, null, 2)
            lastPersistedContent.current = json
            dispatch({
                type: 'UPDATE_FILE_CONTENT',
                payload: { path: filePath, content: json },
            })
        }
    }, [filePath, dispatch])

    // ── Helper: update current page's scenes ──
    const updateCurrentPageScenes = useCallback((updater) => {
        setData(prev => {
            const newData = {
                ...prev,
                pages: prev.pages.map((p, pi) => {
                    if (pi !== currentPage) return p
                    const newScenes = typeof updater === 'function' ? updater(p.scenes) : updater
                    return { ...p, scenes: newScenes }
                }),
            }
            return newData
        })
    }, [currentPage])

    const persistWithUpdatedScenes = useCallback((scenesUpdater) => {
        const newData = {
            ...data,
            pages: data.pages.map((p, pi) => {
                if (pi !== currentPage) return p
                const newScenes = typeof scenesUpdater === 'function' ? scenesUpdater(p.scenes) : scenesUpdater
                return { ...p, scenes: newScenes }
            }),
        }
        persistData(newData)
        return newData
    }, [data, currentPage, persistData])

    // Cell change handler
    const handleCellChange = useCallback((sceneIndex, rowIndex, colKey, value) => {
        setData(prev => {
            const newData = {
                ...prev,
                pages: prev.pages.map((p, pi) => {
                    if (pi !== currentPage) return p
                    return {
                        ...p,
                        scenes: p.scenes.map((scene, si) => {
                            if (si !== sceneIndex) return scene
                            return {
                                ...scene,
                                rows: scene.rows.map((row, ri) => {
                                    if (ri !== rowIndex) return row
                                    return { ...row, [colKey]: value }
                                }),
                            }
                        })
                    }
                })
            }
            clearTimeout(handleCellChange._timer)
            handleCellChange._timer = setTimeout(() => persistData(newData), 300)
            return newData
        })
    }, [persistData, currentPage])

    // Select cell
    const handleSelect = useCallback((sceneIndex, rowIndex, colKey) => {
        const scene = scenes[sceneIndex]
        if (scene && rowIndex >= scene.rows.length) {
            persistWithUpdatedScenes(prev =>
                prev.map((s, si) => {
                    if (si !== sceneIndex) return s
                    return { ...s, rows: [...s.rows, createEmptyRow()] }
                })
            )
        }
        setSelectedCell({ sceneIndex, rowIndex, colKey })
    }, [scenes, persistWithUpdatedScenes])

    // Arrow key navigation handler
    const handleNavigate = useCallback((sceneIndex, rowIndex, colKey, direction) => {
        const colIdx = COLUMNS.findIndex(c => c.key === colKey)

        switch (direction) {
            case 'up': {
                if (rowIndex > 0) {
                    setSelectedCell({ sceneIndex, rowIndex: rowIndex - 1, colKey })
                } else if (sceneIndex > 0) {
                    for (let si = sceneIndex - 1; si >= 0; si--) {
                        const s = scenes[si]
                        if (!s.collapsed && s.rows.length > 0) {
                            setSelectedCell({ sceneIndex: si, rowIndex: s.rows.length - 1, colKey })
                            break
                        }
                    }
                }
                break
            }
            case 'down': {
                const scene = scenes[sceneIndex]
                if (scene && rowIndex < scene.rows.length - 1) {
                    setSelectedCell({ sceneIndex, rowIndex: rowIndex + 1, colKey })
                } else if (sceneIndex < scenes.length - 1) {
                    for (let si = sceneIndex + 1; si < scenes.length; si++) {
                        const s = scenes[si]
                        if (!s.collapsed && s.rows.length > 0) {
                            setSelectedCell({ sceneIndex: si, rowIndex: 0, colKey })
                            break
                        }
                    }
                } else if (scene && rowIndex === scene.rows.length - 1) {
                    handleSelect(sceneIndex, rowIndex + 1, colKey)
                }
                break
            }
            case 'left': {
                if (colIdx > 0) {
                    setSelectedCell({ sceneIndex, rowIndex, colKey: COLUMNS[colIdx - 1].key })
                }
                break
            }
            case 'right': {
                if (colIdx < COLUMNS.length - 1) {
                    setSelectedCell({ sceneIndex, rowIndex, colKey: COLUMNS[colIdx + 1].key })
                }
                break
            }
        }
    }, [scenes, handleSelect])

    // ── Column resize handlers ──
    const handleResizeStart = useCallback((colKey, e) => {
        e.preventDefault()
        e.stopPropagation()
        const startX = e.clientX
        const startWidth = columnWidths[colKey]
        const col = COLUMNS.find(c => c.key === colKey)
        const minW = col?.minWidth || 60

        const handleMouseMove = (moveE) => {
            const delta = moveE.clientX - startX
            const newWidth = Math.max(minW, startWidth + delta)
            setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }))
        }

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [columnWidths])

    // ── Add new scene to current page ──
    const handleAddScene = useCallback(() => {
        const allScenes = data.pages.flatMap(p => p.scenes)
        const maxScene = Math.max(0, ...allScenes.map(s => s.scene))
        persistWithUpdatedScenes(prev => [...prev, createEmptyScene(maxScene + 1)])
    }, [data, persistWithUpdatedScenes])

    // Add row to current scene
    const handleAddRow = useCallback(() => {
        const sceneIdx = selectedCell?.sceneIndex ?? scenes.length - 1
        persistWithUpdatedScenes(prev =>
            prev.map((s, si) => {
                if (si !== sceneIdx) return s
                const insertIdx = selectedCell ? selectedCell.rowIndex + 1 : s.rows.length
                const newRows = [...s.rows]
                newRows.splice(insertIdx, 0, createEmptyRow())
                return { ...s, rows: newRows }
            })
        )
    }, [scenes, selectedCell, persistWithUpdatedScenes])

    // Delete selected row
    const handleDeleteRow = useCallback(() => {
        if (!selectedCell) return
        const { sceneIndex, rowIndex } = selectedCell
        const scene = scenes[sceneIndex]
        if (!scene || scene.rows.length <= 1) return

        persistWithUpdatedScenes(prev =>
            prev.map((s, si) => {
                if (si !== sceneIndex) return s
                return { ...s, rows: s.rows.filter((_, ri) => ri !== rowIndex) }
            })
        )
        setSelectedCell(null)
    }, [scenes, selectedCell, persistWithUpdatedScenes])

    // ── Delete scene (with confirmation) ──
    const handleDeleteScene = useCallback((sceneIndex) => {
        const scene = scenes[sceneIndex]
        if (!scene) return
        setConfirmDialog({
            message: `確定要刪除「場景 ${scene.scene}」嗎？此操作無法復原。`,
            onConfirm: () => {
                const newScenes = scenes.filter((_, si) => si !== sceneIndex)
                if (newScenes.length === 0) {
                    // Keep at least one scene
                    persistWithUpdatedScenes([createEmptyScene(1)])
                } else {
                    persistWithUpdatedScenes(newScenes)
                }
                setSelectedCell(null)
                setConfirmDialog(null)
            },
        })
    }, [scenes, persistWithUpdatedScenes])

    // Toggle scene collapse
    const handleToggleScene = useCallback((sceneIndex) => {
        updateCurrentPageScenes(prev =>
            prev.map((s, si) => {
                if (si !== sceneIndex) return s
                return { ...s, collapsed: !s.collapsed }
            })
        )
    }, [updateCurrentPageScenes])

    // Toggle collapse all
    const handleToggleCollapseAll = useCallback(() => {
        const newCollapsed = !allCollapsed
        setAllCollapsed(newCollapsed)
        updateCurrentPageScenes(prev =>
            prev.map(s => ({ ...s, collapsed: newCollapsed }))
        )
    }, [allCollapsed, updateCurrentPageScenes])

    // ── Handle TSV paste from Excel/spreadsheets ──
    const handlePaste = useCallback((sceneIndex, rowIndex, parsedRows) => {
        if (!parsedRows || parsedRows.length === 0) return

        setData(prev => {
            const newData = {
                ...prev,
                pages: prev.pages.map((p, pi) => {
                    if (pi !== currentPage) return p
                    return {
                        ...p,
                        scenes: p.scenes.map((scene, si) => {
                            if (si !== sceneIndex) return scene
                            const newRows = [...scene.rows]
                            const firstParsed = parsedRows[0]
                            newRows[rowIndex] = { ...newRows[rowIndex], ...firstParsed }
                            for (let i = 1; i < parsedRows.length; i++) {
                                const newRow = { heading: '', character: '', dialogue: '', action: '', notes: '', ...parsedRows[i] }
                                newRows.splice(rowIndex + i, 0, newRow)
                            }
                            return { ...scene, rows: newRows }
                        }),
                    }
                }),
            }
            clearTimeout(handlePaste._timer)
            handlePaste._timer = setTimeout(() => persistData(newData), 300)
            return newData
        })
    }, [persistData, currentPage])

    // Apply text style on selected cell
    const handleApplyStyle = useCallback((style) => {
        switch (style) {
            case 'bold': document.execCommand('bold'); break
            case 'italic': document.execCommand('italic'); break
            case 'underline': document.execCommand('underline'); break
            case 'strikethrough': document.execCommand('strikethrough'); break
            case 'h1':
            case 'h2':
            case 'h3':
                document.execCommand('formatBlock', false, `<${style}>`)
                break
        }
    }, [])

    // Row context menu
    const handleContextMenu = useCallback((e, sceneIndex, rowIndex) => {
        e.preventDefault()
        setSelectedCell({ sceneIndex, rowIndex, colKey: null })
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            sceneIndex,
            rowIndex,
        })
    }, [])

    // ── Scene header context menu ──
    const handleSceneContextMenu = useCallback((e, sceneIndex) => {
        e.preventDefault()
        e.stopPropagation()
        setSceneContextMenu({ x: e.clientX, y: e.clientY, sceneIndex })
    }, [])

    // ── Tab context menu ──
    const handleTabContextMenu = useCallback((e, pageIndex) => {
        e.preventDefault()
        e.stopPropagation()
        setTabContextMenu({ x: e.clientX, y: e.clientY, pageIndex })
    }, [])

    // ── Add new page ──
    const handleAddPage = useCallback(() => {
        const newName = `分頁 ${data.pages.length + 1}`
        const newData = {
            ...data,
            pages: [...data.pages, createEmptyPage(newName)],
        }
        persistData(newData)
        setCurrentPage(newData.pages.length - 1)
    }, [data, persistData])

    // ── Delete page (with confirmation) ──
    const handleDeletePage = useCallback((pageIndex) => {
        if (data.pages.length <= 1) return // Cannot delete the only page
        const page = data.pages[pageIndex]
        setConfirmDialog({
            message: `確定要刪除「${page.name}」嗎？其中的所有場景都會被刪除，此操作無法復原。`,
            onConfirm: () => {
                const newData = {
                    ...data,
                    pages: data.pages.filter((_, pi) => pi !== pageIndex),
                }
                persistData(newData)
                if (currentPage >= newData.pages.length) {
                    setCurrentPage(newData.pages.length - 1)
                }
                setConfirmDialog(null)
            },
        })
    }, [data, currentPage, persistData])

    // ── Rename page (double-click tab) ──
    const [editingTab, setEditingTab] = useState(null) // pageIndex
    const [editingTabName, setEditingTabName] = useState('')

    const handleTabDoubleClick = useCallback((pageIndex) => {
        setEditingTab(pageIndex)
        setEditingTabName(data.pages[pageIndex].name)
    }, [data])

    const handleTabRenameCommit = useCallback(() => {
        if (editingTab === null) return
        const trimmed = editingTabName.trim()
        if (trimmed && trimmed !== data.pages[editingTab].name) {
            const newData = {
                ...data,
                pages: data.pages.map((p, pi) => pi === editingTab ? { ...p, name: trimmed } : p),
            }
            persistData(newData)
        }
        setEditingTab(null)
    }, [editingTab, editingTabName, data, persistData])

    // Close context menus on click elsewhere
    useEffect(() => {
        const handleClick = () => {
            setContextMenu(null)
            setTabContextMenu(null)
            setSceneContextMenu(null)
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    // Ctrl+S save
    const handleSave = useCallback(async () => {
        if (filePath) {
            const json = JSON.stringify({
                format: 'screenplay',
                version: 2,
                pages: data.pages.map(p => ({
                    name: p.name,
                    scenes: p.scenes.map(s => ({
                        scene: s.scene,
                        rows: s.rows,
                    })),
                })),
            }, null, 2)
            const ok = await window.electronAPI.writeFile(filePath, json)
            if (ok) {
                dispatch({ type: 'MARK_FILE_SAVED', payload: filePath })
            }
        }
    }, [filePath, data, dispatch])

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                setShowSearch(true)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleSave])

    // ── Search: compute matches across ALL pages ──
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchMatches([])
            setMatchIndex(0)
            return
        }
        const q = searchQuery.toLowerCase()
        const matches = []
        data.pages.forEach((page, pi) => {
            page.scenes.forEach((scene, si) => {
                scene.rows.forEach((row, ri) => {
                    COLUMNS.forEach(col => {
                        const val = row[col.key] || ''
                        const text = val.replace(/<[^>]*>/g, '').toLowerCase()
                        if (text.includes(q)) {
                            matches.push({ pageIndex: pi, sceneIndex: si, rowIndex: ri, colKey: col.key })
                        }
                    })
                })
            })
        })
        setSearchMatches(matches)
        setMatchIndex(0)
    }, [searchQuery, data])

    // ── Search: scroll to active match ──
    useEffect(() => {
        if (searchMatches.length === 0 || !containerRef.current) return
        const m = searchMatches[matchIndex]
        if (!m) return

        // Switch to correct page
        if (m.pageIndex !== currentPage) {
            setCurrentPage(m.pageIndex)
        }

        // Ensure scene is not collapsed
        if (data.pages[m.pageIndex]?.scenes[m.sceneIndex]?.collapsed) {
            setData(prev => ({
                ...prev,
                pages: prev.pages.map((p, pi) => {
                    if (pi !== m.pageIndex) return p
                    return {
                        ...p,
                        scenes: p.scenes.map((s, si) =>
                            si === m.sceneIndex ? { ...s, collapsed: false } : s
                        )
                    }
                })
            }))
        }

        // Scroll to the cell DOM element
        setTimeout(() => {
            const wrapper = containerRef.current?.querySelector('.screenplay-body')
            if (!wrapper) return
            const sceneEls = wrapper.querySelectorAll('.screenplay-scene')
            const sceneEl = sceneEls[m.sceneIndex]
            if (!sceneEl) return
            const rows = sceneEl.querySelectorAll('.screenplay-row')
            const rowEl = rows[m.rowIndex]
            if (!rowEl) return
            const colIdx = COLUMNS.findIndex(c => c.key === m.colKey)
            const cells = rowEl.querySelectorAll('.screenplay-cell')
            const cell = cells[colIdx + 1]
            if (cell) {
                cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
                cell.classList.add('screenplay-cell--search-hit')
                setTimeout(() => cell.classList.remove('screenplay-cell--search-hit'), 1500)
            }
        }, 80)
    }, [matchIndex, searchMatches, currentPage])

    const handleSearchChange = useCallback((q) => {
        setSearchQuery(q)
        if (!showSearch) setShowSearch(true)
    }, [showSearch])

    const handleSearchNext = useCallback(() => {
        if (searchMatches.length === 0) return
        setMatchIndex(prev => (prev + 1) % searchMatches.length)
    }, [searchMatches])

    const handleSearchPrev = useCallback(() => {
        if (searchMatches.length === 0) return
        setMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length)
    }, [searchMatches])

    const handleSearchClose = useCallback(() => {
        setShowSearch(false)
        setSearchQuery('')
        setSearchMatches([])
        setMatchIndex(0)
    }, [])

    if (!activeFile) return null

    return (
        <motion.div
            className="screenplay-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            ref={containerRef}
        >
            <ScreenplayToolbar
                onAddRow={handleAddRow}
                onAddScene={handleAddScene}
                onDeleteRow={handleDeleteRow}
                onToggleCollapseAll={handleToggleCollapseAll}
                allCollapsed={allCollapsed}
                selectedCell={selectedCell}
                onApplyStyle={handleApplyStyle}
                showSearch={showSearch}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onSearchPrev={handleSearchPrev}
                onSearchNext={handleSearchNext}
                onSearchClose={handleSearchClose}
                matchIndex={matchIndex}
                matchCount={searchMatches.length}
            />

            <div className="screenplay-wrapper">
                {/* Column headers with resize handles */}
                <div className="screenplay-header">
                    <div className="screenplay-cell screenplay-cell--scene screenplay-header__cell">
                        場次
                    </div>
                    {COLUMNS.map(col => (
                        <div
                            key={col.key}
                            className="screenplay-header__cell"
                            style={{ width: columnWidths[col.key], minWidth: col.minWidth }}
                        >
                            <span className="screenplay-header__label">{col.label}</span>
                            <div
                                className="screenplay-header__resize"
                                onMouseDown={(e) => handleResizeStart(col.key, e)}
                                title="拖曳調整欄寬"
                            />
                        </div>
                    ))}
                </div>

                {/* Scenes & Rows (current page only) */}
                <div className="screenplay-body">
                    {scenes.map((scene, sceneIndex) => (
                        <div key={sceneIndex} className="screenplay-scene">
                            {/* Scene header bar */}
                            <div
                                className="screenplay-scene__header"
                                onClick={() => handleToggleScene(sceneIndex)}
                                onContextMenu={(e) => handleSceneContextMenu(e, sceneIndex)}
                            >
                                {scene.collapsed
                                    ? <ChevronRight size={14} />
                                    : <ChevronDown size={14} />
                                }
                                <span className="screenplay-scene__label">
                                    場景 {scene.scene}
                                </span>
                                <span className="screenplay-scene__count">
                                    {scene.rows.length} 行
                                </span>
                            </div>

                            {/* Rows */}
                            {!scene.collapsed && scene.rows.map((row, rowIndex) => (
                                <ScreenplayRow
                                    key={rowIndex}
                                    row={row}
                                    rowIndex={rowIndex}
                                    sceneIndex={sceneIndex}
                                    isSceneHeader={rowIndex === 0}
                                    sceneNumber={scene.scene}
                                    columnWidths={columnWidths}
                                    isSelected={
                                        selectedCell?.sceneIndex === sceneIndex &&
                                            selectedCell?.rowIndex === rowIndex
                                            ? selectedCell.colKey
                                            : null
                                    }
                                    onCellChange={handleCellChange}
                                    onSelect={handleSelect}
                                    onNavigate={handleNavigate}
                                    onContextMenu={handleContextMenu}
                                    onPaste={handlePaste}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Bottom Tab Bar ── */}
            <div className="screenplay-tabbar">
                <div className="screenplay-tabbar__tabs">
                    {data.pages.map((page, pi) => (
                        <div
                            key={pi}
                            className={`screenplay-tabbar__tab ${pi === currentPage ? 'screenplay-tabbar__tab--active' : ''}`}
                            onClick={() => setCurrentPage(pi)}
                            onContextMenu={(e) => handleTabContextMenu(e, pi)}
                            onDoubleClick={() => handleTabDoubleClick(pi)}
                            title={`${page.name} (${page.scenes.length} 場景) · 右鍵管理`}
                        >
                            {editingTab === pi ? (
                                <input
                                    className="screenplay-tabbar__tab-input"
                                    value={editingTabName}
                                    onChange={e => setEditingTabName(e.target.value)}
                                    onBlur={handleTabRenameCommit}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleTabRenameCommit()
                                        if (e.key === 'Escape') setEditingTab(null)
                                    }}
                                    autoFocus
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <span className="screenplay-tabbar__tab-label">{page.name}</span>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    className="screenplay-tabbar__add"
                    onClick={handleAddPage}
                    title="新增分頁"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* ── Scene header context menu ── */}
            {sceneContextMenu && (
                <div
                    className="screenplay-context-menu"
                    style={{ left: sceneContextMenu.x, top: sceneContextMenu.y }}
                >
                    <button onClick={() => { handleAddScene(); setSceneContextMenu(null) }}>
                        在此頁新增場景
                    </button>
                    <div className="screenplay-context-menu__divider" />
                    <button
                        className="screenplay-context-menu__destructive"
                        onClick={() => { handleDeleteScene(sceneContextMenu.sceneIndex); setSceneContextMenu(null) }}
                    >
                        <Trash2 size={13} />
                        刪除此場景
                    </button>
                </div>
            )}

            {/* ── Tab context menu (opens upward since tabs are at bottom) ── */}
            {tabContextMenu && (
                <div
                    className="screenplay-context-menu screenplay-context-menu--above"
                    style={{ left: tabContextMenu.x, bottom: window.innerHeight - tabContextMenu.y }}
                >
                    <button onClick={() => { handleTabDoubleClick(tabContextMenu.pageIndex); setTabContextMenu(null) }}>
                        重新命名
                    </button>
                    <div className="screenplay-context-menu__divider" />
                    <button
                        className="screenplay-context-menu__destructive"
                        onClick={() => { handleDeletePage(tabContextMenu.pageIndex); setTabContextMenu(null) }}
                        disabled={data.pages.length <= 1}
                    >
                        <Trash2 size={13} />
                        刪除此分頁
                    </button>
                </div>
            )}

            {/* ── Row Context Menu ── */}
            {contextMenu && (
                <div
                    className="screenplay-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button onClick={() => { handleAddRow(); setContextMenu(null) }}>
                        在下方插入新行
                    </button>
                    <button onClick={() => { handleAddScene(); setContextMenu(null) }}>
                        在此頁新增場景
                    </button>
                    <div className="screenplay-context-menu__divider" />
                    <button onClick={() => { document.execCommand('cut'); setContextMenu(null) }}>
                        剪下
                    </button>
                    <button onClick={() => { document.execCommand('copy'); setContextMenu(null) }}>
                        複製
                    </button>
                    <button onClick={async () => {
                        try {
                            const text = await navigator.clipboard.readText()
                            document.execCommand('insertText', false, text)
                        } catch {
                            document.execCommand('paste')
                        }
                        setContextMenu(null)
                    }}>
                        貼上
                    </button>
                    <div className="screenplay-context-menu__divider" />
                    <button className="screenplay-context-menu__destructive" onClick={() => { handleDeleteRow(); setContextMenu(null) }}>
                        刪除此行
                    </button>
                </div>
            )}

            {/* ── Confirmation Dialog ── */}
            {confirmDialog && (
                <div className="screenplay-confirm-overlay" onClick={() => setConfirmDialog(null)}>
                    <div className="screenplay-confirm-dialog" onClick={e => e.stopPropagation()}>
                        <p className="screenplay-confirm-dialog__message">{confirmDialog.message}</p>
                        <div className="screenplay-confirm-dialog__actions">
                            <button
                                className="screenplay-confirm-dialog__cancel"
                                onClick={() => setConfirmDialog(null)}
                            >
                                取消
                            </button>
                            <button
                                className="screenplay-confirm-dialog__confirm"
                                onClick={confirmDialog.onConfirm}
                            >
                                確定刪除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
