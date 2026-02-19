import { useState, useRef, useEffect } from 'react'
import {
    Bold, Italic, Strikethrough, Underline as UnderlineIcon,
    Heading1, Heading2, Heading3,
    Scissors, Copy, ClipboardPaste,
    Plus, Trash2,
    ChevronDown, ChevronRight, ChevronUp,
    Type, Paintbrush,
    Search, X,
} from 'lucide-react'
import ColorPicker from './ColorPicker'
import '../styles/toolbar.css'
import '../styles/colorpicker.css'

export default function ScreenplayToolbar({
    onAddRow,
    onAddScene,
    onDeleteRow,
    onToggleCollapseAll,
    allCollapsed,
    selectedCell,
    onApplyStyle,
    showSearch,
    searchQuery,
    onSearchChange,
    onSearchPrev,
    onSearchNext,
    onSearchClose,
    matchIndex,
    matchCount,
}) {
    const [showTextColor, setShowTextColor] = useState(false)
    const [showBgColor, setShowBgColor] = useState(false)
    const [currentTextColor, setCurrentTextColor] = useState('#c9563c')
    const [currentBgColor, setCurrentBgColor] = useState('#fde047')
    const searchInputRef = useRef(null)

    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [showSearch])

    const handleTextColor = (color) => {
        if (color) {
            document.execCommand('foreColor', false, color)
            setCurrentTextColor(color)
        } else {
            document.execCommand('removeFormat', false, null)
        }
        setShowTextColor(false)
    }

    const handleBgColor = (color) => {
        if (color) {
            document.execCommand('hiliteColor', false, color)
            setCurrentBgColor(color)
        } else {
            document.execCommand('hiliteColor', false, 'transparent')
        }
        setShowBgColor(false)
    }

    const textStyles = [
        {
            icon: Bold,
            action: () => onApplyStyle('bold'),
            label: '粗體',
            shortcut: 'Ctrl+B',
        },
        {
            icon: Italic,
            action: () => onApplyStyle('italic'),
            label: '斜體',
            shortcut: 'Ctrl+I',
        },
        {
            icon: Strikethrough,
            action: () => onApplyStyle('strikethrough'),
            label: '刪除線',
        },
        {
            icon: UnderlineIcon,
            action: () => onApplyStyle('underline'),
            label: '底線',
            shortcut: 'Ctrl+U',
        },
    ]

    const headingStyles = [
        {
            icon: Heading1,
            action: () => onApplyStyle('h1'),
            label: '標題一',
        },
        {
            icon: Heading2,
            action: () => onApplyStyle('h2'),
            label: '標題二',
        },
        {
            icon: Heading3,
            action: () => onApplyStyle('h3'),
            label: '標題三',
        },
    ]

    const clipboardActions = [
        {
            icon: Scissors,
            action: () => document.execCommand('cut'),
            label: '剪下 Ctrl+X',
        },
        {
            icon: Copy,
            action: () => document.execCommand('copy'),
            label: '複製 Ctrl+C',
        },
        {
            icon: ClipboardPaste,
            action: async () => {
                try {
                    const text = await navigator.clipboard.readText()
                    document.execCommand('insertText', false, text)
                } catch {
                    document.execCommand('paste')
                }
            },
            label: '貼上 Ctrl+V',
        },
    ]

    const structureActions = [
        {
            icon: Plus,
            action: onAddScene,
            label: '新增場景',
        },
        {
            icon: Plus,
            action: onAddRow,
            label: '新增行',
            secondary: true,
        },
        {
            icon: Trash2,
            action: onDeleteRow,
            label: '刪除選取行',
            destructive: true,
        },
        {
            icon: allCollapsed ? ChevronRight : ChevronDown,
            action: onToggleCollapseAll,
            label: allCollapsed ? '展開全部場景' : '摺疊全部場景',
        },
    ]

    const groups = [clipboardActions, textStyles, headingStyles, structureActions]

    return (
        <div className="toolbar">
            <div className="toolbar__left">
                {groups.map((group, gi) => (
                    <div key={gi} className="toolbar__group">
                        {group.map(({ icon: Icon, action, active, label, destructive, secondary }, bi) => (
                            <button
                                key={bi}
                                className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''} ${destructive ? 'toolbar__btn--destructive' : ''} ${secondary ? 'toolbar__btn--secondary' : ''}`}
                                onClick={action}
                                title={label}
                            >
                                <Icon size={15} strokeWidth={active ? 2.2 : 1.6} />
                            </button>
                        ))}

                        {/* Insert color buttons after text styles group (index 1) */}
                        {gi === 1 && (
                            <>
                                {/* Text Color */}
                                <div className="toolbar__color-wrap">
                                    <button
                                        className="toolbar__color-btn"
                                        onClick={() => {
                                            setShowTextColor(!showTextColor)
                                            setShowBgColor(false)
                                        }}
                                        title="文字顏色"
                                    >
                                        <Type size={14} strokeWidth={1.6} />
                                        <span
                                            className="toolbar__color-indicator"
                                            style={{ background: currentTextColor }}
                                        />
                                    </button>
                                    {showTextColor && (
                                        <ColorPicker
                                            mode="text"
                                            currentColor={currentTextColor}
                                            onSelect={handleTextColor}
                                            onClose={() => setShowTextColor(false)}
                                        />
                                    )}
                                </div>

                                {/* Background Color */}
                                <div className="toolbar__color-wrap">
                                    <button
                                        className="toolbar__color-btn"
                                        onClick={() => {
                                            setShowBgColor(!showBgColor)
                                            setShowTextColor(false)
                                        }}
                                        title="底色"
                                    >
                                        <Paintbrush size={14} strokeWidth={1.6} />
                                        <span
                                            className="toolbar__color-indicator"
                                            style={{ background: currentBgColor }}
                                        />
                                    </button>
                                    {showBgColor && (
                                        <ColorPicker
                                            mode="background"
                                            currentColor={currentBgColor}
                                            onSelect={handleBgColor}
                                            onClose={() => setShowBgColor(false)}
                                        />
                                    )}
                                </div>
                            </>
                        )}

                        {gi < groups.length - 1 && <div className="toolbar__separator" />}
                    </div>
                ))}
            </div>

            {/* Right: search */}
            <div className="toolbar__right">
                {showSearch ? (
                    <div className="toolbar__search">
                        <Search size={13} className="toolbar__search-icon" />
                        <input
                            ref={searchInputRef}
                            className="toolbar__search-input"
                            type="text"
                            placeholder="搜尋文件…"
                            value={searchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.shiftKey ? onSearchPrev() : onSearchNext()
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault()
                                    onSearchClose()
                                }
                            }}
                        />
                        {searchQuery && (
                            <span className="toolbar__search-count">
                                {matchCount > 0 ? `${matchIndex + 1}/${matchCount}` : '0'}
                            </span>
                        )}
                        <button
                            className="toolbar__btn toolbar__search-nav"
                            onClick={onSearchPrev}
                            title="上一個 Shift+Enter"
                        >
                            <ChevronUp size={13} />
                        </button>
                        <button
                            className="toolbar__btn toolbar__search-nav"
                            onClick={onSearchNext}
                            title="下一個 Enter"
                        >
                            <ChevronDown size={13} />
                        </button>
                        <button
                            className="toolbar__btn toolbar__search-nav"
                            onClick={onSearchClose}
                            title="關閉 Esc"
                        >
                            <X size={13} />
                        </button>
                    </div>
                ) : (
                    <button
                        className="toolbar__btn"
                        onClick={() => onSearchChange?.('')}
                        title="搜尋 Ctrl+F"
                        style={{ opacity: 0 }}
                    >
                        <Search size={14} />
                    </button>
                )}
            </div>
        </div>
    )
}
