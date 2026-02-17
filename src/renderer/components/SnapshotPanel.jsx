import { useState, useCallback, useEffect } from 'react'
import {
    Camera, RotateCcw, Trash2, ChevronDown, ChevronRight,
    FileDiff, Clock, Tag, AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/snapshot.css'

// ── Simple line-level diff ──
function computeDiff(oldText, newText) {
    const oldLines = (oldText || '').split('\n')
    const newLines = (newText || '').split('\n')
    const result = []
    const maxLen = Math.max(oldLines.length, newLines.length)

    for (let i = 0; i < maxLen; i++) {
        const oldLine = i < oldLines.length ? oldLines[i] : undefined
        const newLine = i < newLines.length ? newLines[i] : undefined

        if (oldLine === newLine) {
            result.push({ type: 'same', line: newLine, num: i + 1 })
        } else if (oldLine === undefined) {
            result.push({ type: 'add', line: newLine, num: i + 1 })
        } else if (newLine === undefined) {
            result.push({ type: 'del', line: oldLine, num: i + 1 })
        } else {
            result.push({ type: 'del', line: oldLine, num: i + 1 })
            result.push({ type: 'add', line: newLine, num: i + 1 })
        }
    }
    return result
}

function formatTime(ts) {
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d

    if (diff < 60000) return '剛剛'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`

    const pad = n => String(n).padStart(2, '0')
    if (d.getFullYear() === now.getFullYear()) {
        return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function SnapshotPanel() {
    const { activeFilePath, openFiles, project } = useAppState()
    const { updateContent } = useAppActions()
    const activeFile = openFiles.find(f => f.path === activeFilePath)

    const [snapshots, setSnapshots] = useState([])
    const [loading, setLoading] = useState(false)
    const [label, setLabel] = useState('')
    const [showLabelInput, setShowLabelInput] = useState(false)
    const [expandedSnap, setExpandedSnap] = useState(null) // snapshot path
    const [diffData, setDiffData] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)

    // Load snapshots when file changes
    const loadSnapshots = useCallback(async () => {
        if (!project?.path || !activeFilePath) {
            setSnapshots([])
            return
        }
        setLoading(true)
        try {
            const list = await window.electronAPI.listSnapshots(project.path, activeFilePath)
            setSnapshots(list || [])
        } catch {
            setSnapshots([])
        }
        setLoading(false)
    }, [project?.path, activeFilePath])

    useEffect(() => {
        loadSnapshots()
        setExpandedSnap(null)
        setDiffData(null)
    }, [loadSnapshots])

    // Create snapshot
    const handleCreate = useCallback(async () => {
        if (!project?.path || !activeFilePath) return
        setLoading(true)
        const result = await window.electronAPI.createSnapshot(project.path, activeFilePath, label)
        if (result?.ok) {
            setLabel('')
            setShowLabelInput(false)
            await loadSnapshots()
        }
        setLoading(false)
    }, [project?.path, activeFilePath, label, loadSnapshots])

    // Restore snapshot
    const handleRestore = useCallback(async (snapPath) => {
        const data = await window.electronAPI.readSnapshot(snapPath)
        if (data?.content && activeFilePath) {
            updateContent(activeFilePath, data.content)
        }
    }, [activeFilePath, updateContent])

    // Delete snapshot
    const handleDelete = useCallback(async (snapPath) => {
        await window.electronAPI.deleteSnapshot(snapPath)
        setConfirmDelete(null)
        await loadSnapshots()
    }, [loadSnapshots])

    // View diff
    const handleToggleDiff = useCallback(async (snap) => {
        if (expandedSnap === snap.path) {
            setExpandedSnap(null)
            setDiffData(null)
            return
        }
        setExpandedSnap(snap.path)
        const data = await window.electronAPI.readSnapshot(snap.path)
        if (data?.content && activeFile?.content) {
            const currentText = typeof activeFile.content === 'string'
                ? activeFile.content : JSON.stringify(activeFile.content, null, 2)
            const diff = computeDiff(data.content, currentText)
            setDiffData(diff)
        }
    }, [expandedSnap, activeFile])

    if (!activeFilePath) {
        return (
            <div className="snapshot-panel">
                <div className="snapshot-panel__empty">
                    <Clock size={24} />
                    <p>開啟文件以檢視版本歷史</p>
                </div>
            </div>
        )
    }

    return (
        <div className="snapshot-panel">
            {/* Header */}
            <div className="snapshot-panel__header">
                <h3 className="snapshot-panel__title">
                    <Clock size={14} />
                    版本歷史
                </h3>
                <span className="snapshot-panel__file-name">
                    {activeFile?.name || activeFilePath.split(/[\\/]/).pop()}
                </span>
            </div>

            {/* Create snapshot */}
            <div className="snapshot-panel__create">
                {showLabelInput ? (
                    <div className="snapshot-panel__label-row">
                        <input
                            className="snapshot-panel__label-input"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="快照標籤（可選）…"
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCreate()
                                if (e.key === 'Escape') setShowLabelInput(false)
                            }}
                            autoFocus
                        />
                        <button
                            className="snapshot-panel__create-btn snapshot-panel__create-btn--confirm"
                            onClick={handleCreate}
                            disabled={loading}
                        >
                            <Camera size={13} />
                            建立
                        </button>
                    </div>
                ) : (
                    <button
                        className="snapshot-panel__create-btn"
                        onClick={() => setShowLabelInput(true)}
                        disabled={loading || !activeFilePath}
                    >
                        <Camera size={13} />
                        建立快照
                    </button>
                )}
            </div>

            {/* Snapshot list */}
            <div className="snapshot-panel__list">
                {loading && snapshots.length === 0 && (
                    <div className="snapshot-panel__loading">載入中…</div>
                )}

                {!loading && snapshots.length === 0 && (
                    <div className="snapshot-panel__empty-list">
                        <Camera size={18} />
                        <p>尚無快照</p>
                        <p className="snapshot-panel__empty-hint">
                            建立快照以保存目前版本，隨時可回溯
                        </p>
                    </div>
                )}

                <AnimatePresence>
                    {snapshots.map(snap => (
                        <motion.div
                            key={snap.path}
                            className={`snapshot-panel__item ${expandedSnap === snap.path ? 'snapshot-panel__item--expanded' : ''}`}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="snapshot-panel__item-header" onClick={() => handleToggleDiff(snap)}>
                                <div className="snapshot-panel__item-info">
                                    {expandedSnap === snap.path
                                        ? <ChevronDown size={13} />
                                        : <ChevronRight size={13} />
                                    }
                                    <div className="snapshot-panel__item-meta">
                                        <span className="snapshot-panel__item-time">
                                            {formatTime(snap.timestamp)}
                                        </span>
                                        {snap.label && (
                                            <span className="snapshot-panel__item-label">
                                                <Tag size={10} />
                                                {snap.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="snapshot-panel__item-actions">
                                    <span className="snapshot-panel__item-size">
                                        {formatSize(snap.size)}
                                    </span>
                                    <button
                                        className="snapshot-panel__action-btn"
                                        title="還原此版本"
                                        onClick={e => { e.stopPropagation(); handleRestore(snap.path) }}
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                    {confirmDelete === snap.path ? (
                                        <button
                                            className="snapshot-panel__action-btn snapshot-panel__action-btn--danger-confirm"
                                            title="確認刪除"
                                            onClick={e => { e.stopPropagation(); handleDelete(snap.path) }}
                                        >
                                            <AlertCircle size={12} />
                                        </button>
                                    ) : (
                                        <button
                                            className="snapshot-panel__action-btn snapshot-panel__action-btn--danger"
                                            title="刪除快照"
                                            onClick={e => { e.stopPropagation(); setConfirmDelete(snap.path) }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Diff view */}
                            <AnimatePresence>
                                {expandedSnap === snap.path && diffData && (
                                    <motion.div
                                        className="snapshot-panel__diff"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <div className="snapshot-panel__diff-header">
                                            <FileDiff size={12} />
                                            <span>與目前版本的差異</span>
                                        </div>
                                        <div className="snapshot-panel__diff-content">
                                            {diffData.filter(d => d.type !== 'same').length === 0 ? (
                                                <div className="snapshot-panel__diff-identical">
                                                    內容完全相同
                                                </div>
                                            ) : (
                                                diffData
                                                    .filter(d => d.type !== 'same')
                                                    .slice(0, 100)
                                                    .map((d, i) => (
                                                        <div
                                                            key={i}
                                                            className={`snapshot-panel__diff-line snapshot-panel__diff-line--${d.type}`}
                                                        >
                                                            <span className="snapshot-panel__diff-sign">
                                                                {d.type === 'add' ? '+' : '-'}
                                                            </span>
                                                            <span className="snapshot-panel__diff-text">
                                                                {d.line || ' '}
                                                            </span>
                                                        </div>
                                                    ))
                                            )}
                                            {diffData.filter(d => d.type !== 'same').length > 100 && (
                                                <div className="snapshot-panel__diff-more">
                                                    … 還有更多差異
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
