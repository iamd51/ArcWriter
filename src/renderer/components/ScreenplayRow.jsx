import { useRef, useEffect, useCallback } from 'react'
import { GripVertical } from 'lucide-react'
import '../styles/screenplay.css'

const COLUMNS = [
    { key: 'heading', label: '場景標題', defaultWidth: 180, minWidth: 80, placeholder: 'INT./EXT. 場景 - 時間' },
    { key: 'character', label: '角色', defaultWidth: 100, minWidth: 60, placeholder: '角色名' },
    { key: 'dialogue', label: '對白', defaultWidth: 240, minWidth: 100, placeholder: '對白內容…' },
    { key: 'action', label: '動作描述', defaultWidth: 220, minWidth: 80, placeholder: '動作或場景描述…' },
    { key: 'notes', label: '備註', defaultWidth: 140, minWidth: 60, placeholder: '備註…' },
]

export { COLUMNS }

export default function ScreenplayRow({
    row,
    rowIndex,
    sceneIndex,
    isSceneHeader,
    sceneNumber,
    isSelected,
    columnWidths,
    onCellChange,
    onSelect,
    onNavigate,
    onContextMenu,
    onPaste,
}) {
    const cellRefs = useRef({})
    const composingRef = useRef(false)

    const handleCompositionStart = useCallback(() => {
        composingRef.current = true
    }, [])

    const handleCompositionEnd = useCallback((colKey, e) => {
        composingRef.current = false
        // Capture the final committed text
        const value = e.target.innerHTML
        onCellChange(sceneIndex, rowIndex, colKey, value)
    }, [sceneIndex, rowIndex, onCellChange])

    const handleInput = useCallback((colKey, e) => {
        // Skip input during IME composition — wait for compositionend
        if (composingRef.current) return
        const value = e.target.innerHTML
        onCellChange(sceneIndex, rowIndex, colKey, value)
    }, [sceneIndex, rowIndex, onCellChange])

    // ── Paste handler: parse TSV from Excel/spreadsheets ──
    const handlePaste = useCallback((colKey, e) => {
        const clipboardData = e.clipboardData
        if (!clipboardData) return

        const plain = clipboardData.getData('text/plain') || ''

        // Only intercept if content has tabs (typical of Excel/spreadsheet copy)
        if (!plain.includes('\t')) return // let default paste handle normal text

        e.preventDefault()
        e.stopPropagation()

        // Parse TSV: split by newlines, then by tabs
        const lines = plain.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
            .filter(line => line.trim() !== '')

        if (lines.length === 0) return

        // Find starting column index
        const colStartIdx = COLUMNS.findIndex(c => c.key === colKey)
        if (colStartIdx === -1) return

        // Build row data from parsed lines
        const parsedRows = lines.map(line => {
            const cells = line.split('\t')
            const rowData = {}
            cells.forEach((cellText, i) => {
                const targetColIdx = colStartIdx + i
                if (targetColIdx < COLUMNS.length) {
                    rowData[COLUMNS[targetColIdx].key] = cellText.trim()
                }
            })
            return rowData
        })

        // Delegate to parent for multi-row paste handling
        if (onPaste) {
            onPaste(sceneIndex, rowIndex, parsedRows)
        } else {
            // Fallback: just fill the first row into this cell's row
            const firstRow = parsedRows[0]
            if (firstRow) {
                Object.entries(firstRow).forEach(([key, val]) => {
                    onCellChange(sceneIndex, rowIndex, key, val)
                })
            }
        }
    }, [sceneIndex, rowIndex, onCellChange, onPaste])

    const handleKeyDown = useCallback((colKey, e) => {
        // Skip all navigation during IME composition
        if (composingRef.current) return

        // Apply text styles
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault()
                    document.execCommand('bold')
                    return
                case 'i':
                    e.preventDefault()
                    document.execCommand('italic')
                    return
                case 'u':
                    e.preventDefault()
                    document.execCommand('underline')
                    return
            }
        }

        const colIdx = COLUMNS.findIndex(c => c.key === colKey)

        // Arrow key navigation
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            onNavigate(sceneIndex, rowIndex, colKey, 'up')
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            onNavigate(sceneIndex, rowIndex, colKey, 'down')
            return
        }
        if (e.key === 'ArrowLeft') {
            // Only navigate if cursor is at start of cell
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0)
                if (range.startOffset === 0 && range.collapsed) {
                    // Check if we're at the very start (no previous sibling text)
                    const node = range.startContainer
                    const cell = cellRefs.current[colKey]
                    if (cell && (node === cell || (node.nodeType === 3 && node === cell.firstChild))) {
                        e.preventDefault()
                        onNavigate(sceneIndex, rowIndex, colKey, 'left')
                        return
                    }
                }
            }
        }
        if (e.key === 'ArrowRight') {
            // Only navigate if cursor is at end of cell
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0)
                const cell = cellRefs.current[colKey]
                if (cell && range.collapsed) {
                    const textLen = cell.textContent?.length || 0
                    // Calculate total offset from start
                    const tempRange = document.createRange()
                    tempRange.setStart(cell, 0)
                    tempRange.setEnd(range.startContainer, range.startOffset)
                    if (tempRange.toString().length >= textLen) {
                        e.preventDefault()
                        onNavigate(sceneIndex, rowIndex, colKey, 'right')
                        return
                    }
                }
            }
        }

        // Enter → move to next row
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onNavigate(sceneIndex, rowIndex, colKey, 'down')
            return
        }

        // Tab → move to next column
        if (e.key === 'Tab') {
            e.preventDefault()
            const dir = e.shiftKey ? 'left' : 'right'
            // Tab always moves to next/prev column regardless of cursor
            const nextColIdx = colIdx + (e.shiftKey ? -1 : 1)
            if (nextColIdx >= 0 && nextColIdx < COLUMNS.length) {
                onSelect(sceneIndex, rowIndex, COLUMNS[nextColIdx].key)
            } else if (nextColIdx >= COLUMNS.length) {
                // Wrap to first column of next row
                onNavigate(sceneIndex, rowIndex, colKey, 'down')
            } else {
                // Wrap to last column of previous row
                onNavigate(sceneIndex, rowIndex, colKey, 'up')
            }
        }
    }, [sceneIndex, rowIndex, onSelect, onNavigate])

    const handleFocus = useCallback((colKey) => {
        onSelect(sceneIndex, rowIndex, colKey)
    }, [sceneIndex, rowIndex, onSelect])

    // Focus cell when selected externally
    useEffect(() => {
        if (isSelected && cellRefs.current[isSelected]) {
            const cell = cellRefs.current[isSelected]
            cell.focus()
            // Place cursor at end
            const range = document.createRange()
            const sel = window.getSelection()
            range.selectNodeContents(cell)
            range.collapse(false) // collapse to end
            sel.removeAllRanges()
            sel.addRange(range)
        }
    }, [isSelected])

    return (
        <div
            className={`screenplay-row ${isSceneHeader ? 'screenplay-row--scene-header' : ''} ${isSelected ? 'screenplay-row--selected' : ''}`}
            onContextMenu={(e) => onContextMenu(e, sceneIndex, rowIndex)}
        >
            {/* Scene number column */}
            <div className="screenplay-cell screenplay-cell--scene">
                {isSceneHeader ? (
                    <span className="screenplay-cell__scene-num">{sceneNumber}</span>
                ) : (
                    <span className="screenplay-cell__row-num">{rowIndex + 1}</span>
                )}
                <GripVertical size={12} className="screenplay-cell__grip" />
            </div>

            {/* Data columns */}
            {COLUMNS.map(col => {
                const w = columnWidths?.[col.key] ?? col.defaultWidth
                return (
                    <div
                        key={col.key}
                        className={`screenplay-cell screenplay-cell--${col.key}`}
                        style={{ width: w, minWidth: col.minWidth }}
                    >
                        <div
                            ref={el => cellRefs.current[col.key] = el}
                            className="screenplay-cell__input"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder={col.placeholder}
                            onInput={(e) => handleInput(col.key, e)}
                            onKeyDown={(e) => handleKeyDown(col.key, e)}
                            onPaste={(e) => handlePaste(col.key, e)}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={(e) => handleCompositionEnd(col.key, e)}
                            onFocus={() => handleFocus(col.key)}
                            dangerouslySetInnerHTML={{ __html: row[col.key] || '' }}
                        />
                    </div>
                )
            })}
        </div>
    )
}
