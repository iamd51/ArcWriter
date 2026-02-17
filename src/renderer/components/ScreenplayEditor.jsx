import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
        if (data.format === 'screenplay' && data.scenes) return data
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
                if (data.format === 'screenplay' && data.scenes) {
                    console.warn('[ScreenplayEditor] Recovered corrupted JSON')
                    return data
                }
            }
        } catch { /* recovery also failed */ }
    }
    return null
}

function parseScreenplayData(content) {
    return parseScreenplayJSON(content) || { format: 'screenplay', version: 1, scenes: [createEmptyScene(1)] }
}

export default function ScreenplayEditor() {
    const { activeFilePath, openFiles } = useAppState()
    const dispatch = useAppDispatch()

    const activeFile = openFiles.find(f => f.path === activeFilePath)
    const [data, setData] = useState(() => parseScreenplayData(activeFile?.content))
    const [selectedCell, setSelectedCell] = useState(null) // { sceneIndex, rowIndex, colKey }
    const [allCollapsed, setAllCollapsed] = useState(false)
    const [contextMenu, setContextMenu] = useState(null)
    const containerRef = useRef(null)
    const lastFilePath = useRef(activeFilePath)
    const lastPersistedContent = useRef(null) // track content we set ourselves

    // Column widths state (resizable)
    const [columnWidths, setColumnWidths] = useState(() => {
        const widths = {}
        COLUMNS.forEach(col => { widths[col.key] = col.defaultWidth })
        return widths
    })
    const resizeRef = useRef(null) // for tracking resize drag

    // Sync from file when active file changes OR its content is loaded/updated externally
    useEffect(() => {
        if (!activeFile) return
        const fileContent = activeFile.content

        // If the path changed, always re-parse
        if (activeFilePath !== lastFilePath.current) {
            lastFilePath.current = activeFilePath
            lastPersistedContent.current = fileContent
            setData(parseScreenplayData(fileContent))
            return
        }

        // If content changed but NOT from our own persistData, re-parse
        if (fileContent && fileContent !== lastPersistedContent.current) {
            lastPersistedContent.current = fileContent
            setData(parseScreenplayData(fileContent))
        }
    }, [activeFilePath, activeFile?.content])

    // Persist changes back to store
    const persistData = useCallback((newData) => {
        setData(newData)
        if (activeFilePath) {
            const json = JSON.stringify({
                format: 'screenplay',
                version: 1,
                scenes: newData.scenes.map(s => ({
                    scene: s.scene,
                    rows: s.rows,
                })),
            }, null, 2)
            lastPersistedContent.current = json  // mark as our own write
            dispatch({
                type: 'UPDATE_FILE_CONTENT',
                payload: { path: activeFilePath, content: json },
            })
        }
    }, [activeFilePath, dispatch])

    // Cell change handler
    const handleCellChange = useCallback((sceneIndex, rowIndex, colKey, value) => {
        setData(prev => {
            const newData = {
                ...prev, scenes: prev.scenes.map((scene, si) => {
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
            clearTimeout(handleCellChange._timer)
            handleCellChange._timer = setTimeout(() => persistData(newData), 300)
            return newData
        })
    }, [persistData])

    // Select cell
    const handleSelect = useCallback((sceneIndex, rowIndex, colKey) => {
        const scene = data.scenes[sceneIndex]
        if (scene && rowIndex >= scene.rows.length) {
            const newData = {
                ...data, scenes: data.scenes.map((s, si) => {
                    if (si !== sceneIndex) return s
                    return { ...s, rows: [...s.rows, createEmptyRow()] }
                })
            }
            setData(newData)
            persistData(newData)
        }
        setSelectedCell({ sceneIndex, rowIndex, colKey })
    }, [data, persistData])

    // Arrow key navigation handler
    const handleNavigate = useCallback((sceneIndex, rowIndex, colKey, direction) => {
        const colIdx = COLUMNS.findIndex(c => c.key === colKey)

        switch (direction) {
            case 'up': {
                if (rowIndex > 0) {
                    setSelectedCell({ sceneIndex, rowIndex: rowIndex - 1, colKey })
                } else if (sceneIndex > 0) {
                    // Move to last row of previous non-collapsed scene
                    for (let si = sceneIndex - 1; si >= 0; si--) {
                        const s = data.scenes[si]
                        if (!s.collapsed && s.rows.length > 0) {
                            setSelectedCell({ sceneIndex: si, rowIndex: s.rows.length - 1, colKey })
                            break
                        }
                    }
                }
                break
            }
            case 'down': {
                const scene = data.scenes[sceneIndex]
                if (scene && rowIndex < scene.rows.length - 1) {
                    setSelectedCell({ sceneIndex, rowIndex: rowIndex + 1, colKey })
                } else if (sceneIndex < data.scenes.length - 1) {
                    // Move to first row of next non-collapsed scene
                    for (let si = sceneIndex + 1; si < data.scenes.length; si++) {
                        const s = data.scenes[si]
                        if (!s.collapsed && s.rows.length > 0) {
                            setSelectedCell({ sceneIndex: si, rowIndex: 0, colKey })
                            break
                        }
                    }
                } else if (scene && rowIndex === scene.rows.length - 1) {
                    // At the last row of last scene: add a new row
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
    }, [data, handleSelect])

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

    // Add new scene
    const handleAddScene = useCallback(() => {
        const maxScene = Math.max(0, ...data.scenes.map(s => s.scene))
        const newData = {
            ...data,
            scenes: [...data.scenes, createEmptyScene(maxScene + 1)],
        }
        persistData(newData)
    }, [data, persistData])

    // Add row to current scene
    const handleAddRow = useCallback(() => {
        const sceneIdx = selectedCell?.sceneIndex ?? data.scenes.length - 1
        const newData = {
            ...data, scenes: data.scenes.map((s, si) => {
                if (si !== sceneIdx) return s
                const insertIdx = selectedCell ? selectedCell.rowIndex + 1 : s.rows.length
                const newRows = [...s.rows]
                newRows.splice(insertIdx, 0, createEmptyRow())
                return { ...s, rows: newRows }
            })
        }
        persistData(newData)
    }, [data, selectedCell, persistData])

    // Delete selected row
    const handleDeleteRow = useCallback(() => {
        if (!selectedCell) return
        const { sceneIndex, rowIndex } = selectedCell
        const scene = data.scenes[sceneIndex]
        if (!scene || scene.rows.length <= 1) return

        const newData = {
            ...data, scenes: data.scenes.map((s, si) => {
                if (si !== sceneIndex) return s
                return { ...s, rows: s.rows.filter((_, ri) => ri !== rowIndex) }
            })
        }
        persistData(newData)
        setSelectedCell(null)
    }, [data, selectedCell, persistData])

    // Toggle scene collapse
    const handleToggleScene = useCallback((sceneIndex) => {
        setData(prev => ({
            ...prev,
            scenes: prev.scenes.map((s, si) => {
                if (si !== sceneIndex) return s
                return { ...s, collapsed: !s.collapsed }
            }),
        }))
    }, [])

    // Toggle collapse all
    const handleToggleCollapseAll = useCallback(() => {
        const newCollapsed = !allCollapsed
        setAllCollapsed(newCollapsed)
        setData(prev => ({
            ...prev,
            scenes: prev.scenes.map(s => ({ ...s, collapsed: newCollapsed })),
        }))
    }, [allCollapsed])

    // ── Handle TSV paste from Excel/spreadsheets ──
    const handlePaste = useCallback((sceneIndex, rowIndex, parsedRows) => {
        if (!parsedRows || parsedRows.length === 0) return

        setData(prev => {
            const newData = {
                ...prev,
                scenes: prev.scenes.map((scene, si) => {
                    if (si !== sceneIndex) return scene

                    const newRows = [...scene.rows]

                    // First parsed row: merge into the existing target row
                    const firstParsed = parsedRows[0]
                    newRows[rowIndex] = { ...newRows[rowIndex], ...firstParsed }

                    // Subsequent parsed rows: insert after the target row
                    for (let i = 1; i < parsedRows.length; i++) {
                        const newRow = { heading: '', character: '', dialogue: '', action: '', notes: '', ...parsedRows[i] }
                        newRows.splice(rowIndex + i, 0, newRow)
                    }

                    return { ...scene, rows: newRows }
                }),
            }

            clearTimeout(handlePaste._timer)
            handlePaste._timer = setTimeout(() => persistData(newData), 300)
            return newData
        })
    }, [persistData])

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

    // Context menu
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

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null)
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    // Ctrl+S save
    const handleSave = useCallback(async () => {
        if (activeFilePath) {
            const json = JSON.stringify({
                format: 'screenplay',
                version: 1,
                scenes: data.scenes.map(s => ({
                    scene: s.scene,
                    rows: s.rows,
                })),
            }, null, 2)
            const ok = await window.electronAPI.writeFile(activeFilePath, json)
            if (ok) {
                dispatch({ type: 'MARK_FILE_SAVED', payload: activeFilePath })
            }
        }
    }, [activeFilePath, data, dispatch])

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleSave])

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

                {/* Scenes & Rows */}
                <div className="screenplay-body">
                    {data.scenes.map((scene, sceneIndex) => (
                        <div key={sceneIndex} className="screenplay-scene">
                            {/* Scene header bar */}
                            <div
                                className="screenplay-scene__header"
                                onClick={() => handleToggleScene(sceneIndex)}
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

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="screenplay-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button onClick={() => { handleAddRow(); setContextMenu(null) }}>
                        在下方插入新行
                    </button>
                    <button onClick={() => { handleAddScene(); setContextMenu(null) }}>
                        在下方插入新場景
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
        </motion.div>
    )
}
