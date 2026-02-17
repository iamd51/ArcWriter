import { useState, useEffect, useRef, useCallback } from 'react'
import { Feather, Minus, Square, X, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/titlebar.css'

const MENU_ITEMS = [
    {
        label: '檔案',
        items: [
            { label: '開啟專案資料夾', action: 'openFolder', shortcut: '' },
            { divider: true },
            { label: '新增小說檔案', action: 'newNovel', shortcut: 'Ctrl+N' },
            { label: '新增劇本檔案', action: 'newScreenplay', shortcut: '' },
            { divider: true },
            { label: '儲存', action: 'save', shortcut: 'Ctrl+S' },
            { label: '另存新檔', action: 'saveAs', shortcut: 'Ctrl+Shift+S' },
        ],
    },
    {
        label: '編輯',
        items: [
            { label: '復原', action: 'undo', shortcut: 'Ctrl+Z' },
            { label: '重做', action: 'redo', shortcut: 'Ctrl+Y' },
            { divider: true },
            { label: '剪下', action: 'cut', shortcut: 'Ctrl+X' },
            { label: '複製', action: 'copy', shortcut: 'Ctrl+C' },
            { label: '貼上', action: 'paste', shortcut: 'Ctrl+V' },
            { divider: true },
            { label: '搜尋', action: 'find', shortcut: 'Ctrl+F' },
            { label: '取代', action: 'replace', shortcut: 'Ctrl+H' },
            { label: '跨檔搜尋', action: 'findInProject', shortcut: 'Ctrl+Shift+F' },
        ],
    },
    {
        label: '檢視',
        items: [
            { label: '命令面板', action: 'commandPalette', shortcut: 'Ctrl+P' },
            { label: '切換側邊欄', action: 'toggleSidebar', shortcut: 'Ctrl+B' },
            { divider: true },
            { label: '放大', action: 'zoomIn', shortcut: 'Ctrl+=' },
            { label: '縮小', action: 'zoomOut', shortcut: 'Ctrl+-' },
            { label: '重設縮放', action: 'zoomReset', shortcut: 'Ctrl+0' },
        ],
    },
]

export default function TitleBar({ onMenuAction }) {
    const [maximized, setMaximized] = useState(false)
    const [activeMenu, setActiveMenu] = useState(null)
    const menuRef = useRef(null)

    useEffect(() => {
        window.electronAPI?.isMaximized().then(setMaximized)
        window.electronAPI?.onMaximizedChange(setMaximized)
    }, [])

    // Close menu when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setActiveMenu(null)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleMenuClick = useCallback((index) => {
        setActiveMenu(prev => prev === index ? null : index)
    }, [])

    const handleMenuHover = useCallback((index) => {
        if (activeMenu !== null) {
            setActiveMenu(index)
        }
    }, [activeMenu])

    const handleAction = useCallback((action) => {
        setActiveMenu(null)
        onMenuAction?.(action)
    }, [onMenuAction])

    return (
        <motion.div
            className="titlebar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="titlebar__left">
                <div className="titlebar__brand">
                    <Feather className="titlebar__logo" size={16} />
                    <span className="titlebar__title">ArcWriter</span>
                </div>

                {/* Menu bar */}
                <div className="titlebar__menu" ref={menuRef}>
                    {MENU_ITEMS.map((menu, mi) => (
                        <div key={mi} className="titlebar__menu-item">
                            <button
                                className={`titlebar__menu-trigger ${activeMenu === mi ? 'titlebar__menu-trigger--active' : ''}`}
                                onClick={() => handleMenuClick(mi)}
                                onMouseEnter={() => handleMenuHover(mi)}
                            >
                                {menu.label}
                            </button>

                            <AnimatePresence>
                                {activeMenu === mi && (
                                    <motion.div
                                        className="titlebar__dropdown"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {menu.items.map((item, ii) =>
                                            item.divider ? (
                                                <div key={ii} className="titlebar__dropdown-divider" />
                                            ) : (
                                                <button
                                                    key={ii}
                                                    className="titlebar__dropdown-item"
                                                    onClick={() => handleAction(item.action)}
                                                >
                                                    <span>{item.label}</span>
                                                    {item.shortcut && (
                                                        <span className="titlebar__shortcut">{item.shortcut}</span>
                                                    )}
                                                </button>
                                            )
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            <div className="titlebar__controls">
                <button
                    className="titlebar__btn"
                    onClick={() => window.electronAPI?.windowMinimize()}
                    title="最小化"
                >
                    <Minus size={14} />
                </button>
                <button
                    className="titlebar__btn"
                    onClick={() => window.electronAPI?.windowMaximize()}
                    title={maximized ? '還原' : '最大化'}
                >
                    {maximized ? <Maximize2 size={12} /> : <Square size={11} />}
                </button>
                <button
                    className="titlebar__btn titlebar__btn--close"
                    onClick={() => window.electronAPI?.windowClose()}
                    title="關閉"
                >
                    <X size={14} />
                </button>
            </div>
        </motion.div>
    )
}
