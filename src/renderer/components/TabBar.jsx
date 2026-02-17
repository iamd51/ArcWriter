import { X } from 'lucide-react'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/tabbar.css'

export default function TabBar() {
    const { openFiles, activeFilePath } = useAppState()
    const { setActiveFile, closeFile } = useAppActions()

    if (openFiles.length === 0) return null

    return (
        <div className="tabbar">
            {openFiles.map(file => (
                <div
                    key={file.path}
                    className={`tabbar__tab ${file.path === activeFilePath ? 'tabbar__tab--active' : ''}`}
                    onClick={() => setActiveFile(file.path)}
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
    )
}
