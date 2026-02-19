import { useState, useEffect, useCallback } from 'react'
import { Feather, FolderOpen, Clock, ChevronRight, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions, useAppDispatch } from '../store/useAppStore'
import '../styles/welcome.css'

const RECENT_PROJECTS_KEY = 'arcwriter_recent_projects'

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.2,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
}

export default function WelcomeScreen() {
    const { openFolder } = useAppActions()
    const dispatch = useAppDispatch()
    const [recentProjects, setRecentProjects] = useState([])
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [projectName, setProjectName] = useState('')
    const [createError, setCreateError] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]')
            setRecentProjects(stored.slice(0, 5))
        } catch { /* ignore */ }
    }, [])

    const handleOpenRecent = useCallback(async (projectPath) => {
        try {
            const tree = await window.electronAPI.readDirectory(projectPath)
            const name = projectPath.split(/[\\/]/).pop()
            dispatch({ type: 'SET_PROJECT', payload: { path: projectPath, name, tree } })
        } catch {
            // Project folder may no longer exist — remove from recents
            const stored = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]')
            const updated = stored.filter(p => p.path !== projectPath)
            localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated))
            setRecentProjects(updated)
        }
    }, [dispatch])

    const handleCreateProject = useCallback(async () => {
        const name = projectName.trim()
        if (!name) {
            setCreateError('請輸入專案名稱')
            return
        }
        setIsCreating(true)
        setCreateError('')
        try {
            const result = await window.electronAPI.createProject(name)
            if (!result) {
                // User cancelled folder picker
                setIsCreating(false)
                return
            }
            if (result.error) {
                setCreateError(result.error)
                setIsCreating(false)
                return
            }
            // Success — open the project
            dispatch({ type: 'SET_PROJECT', payload: result })
            // Save to recents
            try {
                const stored = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]')
                const updated = [
                    { path: result.path, name: result.name, time: Date.now() },
                    ...stored.filter(p => p.path !== result.path),
                ].slice(0, 10)
                localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated))
            } catch { /* ignore */ }
            setShowCreateDialog(false)
            setProjectName('')
        } catch (e) {
            setCreateError(e.message || '建立失敗')
        }
        setIsCreating(false)
    }, [projectName, dispatch])

    const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const d = new Date(timestamp)
        const now = new Date()
        const diff = now - d
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
        return d.toLocaleDateString('zh-TW')
    }

    return (
        <div className="welcome">
            {/* Ink wash clouds — decorative */}
            <div className="welcome__cloud welcome__cloud--1" />
            <div className="welcome__cloud welcome__cloud--2" />
            <div className="welcome__cloud welcome__cloud--3" />

            <motion.div
                className="welcome__content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants} className="welcome__icon-wrap">
                    <Feather className="welcome__icon" size={44} />
                </motion.div>

                <motion.h1 variants={itemVariants} className="welcome__title">
                    ArcWriter
                </motion.h1>

                <motion.p variants={itemVariants} className="welcome__subtitle">
                    為劇本作家打造的寫作工坊<br />
                    讓靈感在指尖流淌
                </motion.p>

                <motion.div variants={itemVariants} className="welcome__actions">
                    <motion.button
                        className="welcome__action welcome__action--primary"
                        onClick={() => setShowCreateDialog(true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <Sparkles size={16} />
                        開始旅程
                    </motion.button>

                    <motion.button
                        className="welcome__action welcome__action--secondary"
                        onClick={openFolder}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <FolderOpen size={16} />
                        開啟現有專案
                    </motion.button>
                </motion.div>

                {recentProjects.length > 0 && (
                    <motion.div variants={itemVariants} className="welcome__recent">
                        <div className="welcome__recent-header">
                            <Clock size={13} />
                            <span>最近開啟</span>
                        </div>
                        <div className="welcome__recent-list">
                            {recentProjects.map((p, i) => (
                                <button
                                    key={p.path}
                                    className="welcome__recent-item"
                                    onClick={() => handleOpenRecent(p.path)}
                                >
                                    <FolderOpen size={13} className="welcome__recent-icon" />
                                    <span className="welcome__recent-name">{p.name}</span>
                                    <span className="welcome__recent-time">{formatTime(p.time)}</span>
                                    <ChevronRight size={12} className="welcome__recent-arrow" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.p variants={itemVariants} className="welcome__shortcut">
                    拖曳檔案到視窗也可以直接開啟
                </motion.p>
            </motion.div>

            {/* Create Project Dialog */}
            <AnimatePresence>
                {showCreateDialog && (
                    <motion.div
                        className="welcome__dialog-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowCreateDialog(false)}
                    >
                        <motion.div
                            className="welcome__dialog"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                className="welcome__dialog-close"
                                onClick={() => setShowCreateDialog(false)}
                            >
                                <X size={14} />
                            </button>

                            <div className="welcome__dialog-icon">
                                <Sparkles size={28} />
                            </div>

                            <h2 className="welcome__dialog-title">開始新的旅程</h2>
                            <p className="welcome__dialog-desc">
                                為你的故事取個名字，ArcWriter 會為你建立專案資料夾
                            </p>

                            <input
                                className="welcome__dialog-input"
                                type="text"
                                placeholder="專案名稱，例如：我的第一部劇本"
                                value={projectName}
                                onChange={e => {
                                    setProjectName(e.target.value)
                                    setCreateError('')
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateProject()
                                    if (e.key === 'Escape') setShowCreateDialog(false)
                                }}
                                autoFocus
                            />

                            {createError && (
                                <p className="welcome__dialog-error">{createError}</p>
                            )}

                            <div className="welcome__dialog-scaffold">
                                <span className="welcome__dialog-scaffold-label">將建立以下結構：</span>
                                <div className="welcome__dialog-tree">
                                    <span>📁 {projectName || '專案名稱'}/</span>
                                    <span>   ├── 📁 小說/</span>
                                    <span>   ├── 📁 劇本/</span>
                                    <span>   ├── 📁 筆記/</span>
                                    <span>   └── 📄 README.md</span>
                                </div>
                            </div>

                            <button
                                className="welcome__dialog-confirm"
                                onClick={handleCreateProject}
                                disabled={!projectName.trim() || isCreating}
                            >
                                {isCreating ? '建立中…' : '選擇位置並建立'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
