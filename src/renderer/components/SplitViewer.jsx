import { useRef } from 'react'
import { X } from 'lucide-react'
import { useAppState } from '../store/useAppStore'
import '../styles/splitview.css'

/**
 * Read-only viewer for the split (right) pane.
 * Displays file content as rendered HTML or plain text.
 */
export default function SplitViewer({ filePath, onClose, style }) {
    const { openFiles } = useAppState()
    const file = openFiles.find(f => f.path === filePath)
    const containerRef = useRef(null)

    if (!file) {
        return (
            <div className="split-viewer split-viewer--empty">
                <p>找不到檔案</p>
                <button className="split-viewer__close-btn" onClick={onClose}>
                    <X size={14} />
                </button>
            </div>
        )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isHTML = ['docx', 'xlsx', 'xls', 'pdf'].includes(ext) ||
        (file.content && file.content.trim().startsWith('<'))

    // Determine display name
    const displayName = file.name

    return (
        <div className="split-viewer" style={style}>
            {/* Header */}
            <div className="split-viewer__header">
                <FileText size={14} className="split-viewer__icon" />
                <span className="split-viewer__title" title={file.path}>{displayName}</span>
                <span className="split-viewer__badge">唯讀</span>
                <button className="split-viewer__close-btn" onClick={onClose} title="關閉並列檢視">
                    <X size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="split-viewer__body" ref={containerRef}>
                {isHTML ? (
                    <div
                        className="split-viewer__html-content"
                        dangerouslySetInnerHTML={{ __html: file.content }}
                    />
                ) : ext === 'arc' ? (
                    <ScreenplayViewer content={file.content} />
                ) : (
                    <pre className="split-viewer__text-content">{file.content}</pre>
                )}
            </div>
        </div>
    )
}

/**
 * Mini-viewer for .arc screenplay files — renders scenes as readable text.
 */
function ScreenplayViewer({ content }) {
    let scenes = []
    try {
        const data = JSON.parse(content)
        const allScenes = data.pages
            ? data.pages.flatMap(p => p.scenes)
            : data.scenes || []
        scenes = allScenes
    } catch {
        return <pre className="split-viewer__text-content">{content}</pre>
    }

    return (
        <div className="split-viewer__screenplay">
            {scenes.map((scene, si) => (
                <div key={si} className="split-viewer__scene">
                    <div className="split-viewer__scene-header">場景 {scene.scene}</div>
                    {scene.rows?.map((row, ri) => (
                        <div key={ri} className="split-viewer__scene-row">
                            {row.heading && <div className="split-viewer__heading">{row.heading}</div>}
                            {row.location && <span className="split-viewer__field">{row.location}</span>}
                            {row.character && <span className="split-viewer__field split-viewer__field--char">{row.character}</span>}
                            {row.dialogue && <span className="split-viewer__field split-viewer__field--dial">{row.dialogue}</span>}
                            {row.action && <span className="split-viewer__field split-viewer__field--action">{row.action}</span>}
                            {row.note && <span className="split-viewer__field split-viewer__field--note">({row.note})</span>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
