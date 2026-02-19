import { useState } from 'react'
import { X, PanelRight, PanelLeft } from 'lucide-react'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/tabbar.css'

export default function TabBar({ onSplitRight, onSplitLeft }) {
    const { openFiles, activeFilePath } = useAppState()
    const { setActiveFile, closeFile } = useAppActions()
    const [ctxMenu, setCtxMenu] = useState(null)

    if (openFiles.length === 0) return null

    const handleContextMenu = (e, file) => {
        e.preventDefault()
        setCtxMenu({ x: e.clientX, y: e.clientY, file })
    }

    return (
        <>
            <div className="tabbar">
                {openFiles.map(file => (
                    <div
                        key={file.path}
                        className={`tabbar__tab ${file.path === activeFilePath ? 'tabbar__tab--active' : ''}`}
                        onClick={() => setActiveFile(file.path)}
                        onContextMenu={(e) => handleContextMenu(e, file)}
                    >
                        {file.modified && <span className="tabbar__modified" />}
                        <span className="tabbar__label">{file.name}</span>
                        <button
                            className="tabbar__close"
                            onClick={(e) => {
                                e.stopPropagation()
                                closeFile(file.path)
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Tab context menu */}
            {ctxMenu && (
                <>
                    <div
                        className="tabbar-ctx-overlay"
                        onClick={() => setCtxMenu(null)}
                    />
                    <div
                        className="tabbar-ctx-menu"
                        style={{ left: ctxMenu.x, top: ctxMenu.y }}
                    >
                        {onSplitRight && (
                            <button onClick={() => {
                                onSplitRight(ctxMenu.file.path)
                                setCtxMenu(null)
                            }}>
                                <PanelRight size={13} />
                                在右側並列開啟
                            </button>
                        )}
                        {onSplitLeft && (
                            <button onClick={() => {
                                onSplitLeft(ctxMenu.file.path)
                                setCtxMenu(null)
                            }}>
                                <PanelLeft size={13} />
                                在左側並列開啟
                            </button>
                        )}
                        <div className="tabbar-ctx-divider" />
                        <button onClick={() => {
                            closeFile(ctxMenu.file.path)
                            setCtxMenu(null)
                        }}>
                            <X size={13} />
                            關閉此分頁
                        </button>
                    </div>
                </>
            )}
        </>
    )
}
