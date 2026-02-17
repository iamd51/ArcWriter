import { Sparkles, BookOpen, Clapperboard, Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/statusbar.css'

export default function StatusBar() {
    const { activeFilePath, openFiles } = useAppState()
    const { setActivePanel } = useAppActions()
    const activeFile = openFiles.find(f => f.path === activeFilePath)

    // Determine editor mode
    const ext = activeFilePath?.split('.').pop()?.toLowerCase()
    const isScreenplay = ext === 'arc'

    // Word count: for novel mode count characters, for screenplay mode count data
    const wordCount = (() => {
        if (!activeFile?.content) return 0
        if (isScreenplay) {
            try {
                const data = typeof activeFile.content === 'string'
                    ? JSON.parse(activeFile.content)
                    : activeFile.content
                if (data.scenes) {
                    let count = 0
                    data.scenes.forEach(scene => {
                        scene.rows?.forEach(row => {
                            Object.values(row).forEach(val => {
                                if (typeof val === 'string') {
                                    count += val.replace(/<[^>]*>/g, '').replace(/\s/g, '').length
                                }
                            })
                        })
                    })
                    return count
                }
            } catch { /* fallthrough */ }
        }
        return activeFile.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length
    })()

    const modeLabel = isScreenplay ? '劇本模式' : 'Markdown'
    const ModeIcon = isScreenplay ? Clapperboard : BookOpen

    // Save state indicator
    const renderSaveState = () => {
        if (!activeFile) return null
        if (activeFile.modified) {
            return (
                <>
                    <span className="statusbar__divider" />
                    <span className="statusbar__item statusbar__unsaved">
                        <span className="statusbar__save-dot statusbar__save-dot--unsaved" />
                        未儲存 · 自動儲存中…
                    </span>
                </>
            )
        }
        return (
            <>
                <span className="statusbar__divider" />
                <span className="statusbar__item statusbar__saved">
                    <Check size={11} strokeWidth={2.5} />
                    已儲存
                </span>
            </>
        )
    }

    return (
        <motion.div
            className="statusbar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="statusbar__left">
                <span className="statusbar__item statusbar__mode">
                    <ModeIcon size={11} />
                    {modeLabel}
                </span>
                <span className="statusbar__divider" />
                <span className="statusbar__item">
                    字數 {wordCount.toLocaleString()}
                </span>
                <span className="statusbar__divider" />
                <span className="statusbar__item">UTF-8</span>
                {renderSaveState()}
            </div>

            <div className="statusbar__right">
                <button className="statusbar__ai-btn" onClick={() => setActivePanel('ai')}>
                    <Sparkles size={12} />
                    <span>AI 速寫</span>
                </button>
            </div>
        </motion.div>
    )
}
