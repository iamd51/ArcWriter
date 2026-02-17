import { useState, useEffect, useCallback } from 'react'
import { Feather, FolderOpen, Clock, ChevronRight } from 'lucide-react'
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

                <motion.button
                    variants={itemVariants}
                    className="welcome__action"
                    onClick={openFolder}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <FolderOpen size={16} />
                    開啟專案資料夾
                </motion.button>

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
        </div>
    )
}
