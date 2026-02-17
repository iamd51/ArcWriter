import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    BarChart3, FileText, Film, Clock, BookOpen,
    Users, MapPin, Globe, TrendingUp, Folder,
    PenLine, Target, ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/dashboard.css'

// ─── Helpers ───
function countWords(content) {
    if (!content) return 0
    const text = typeof content === 'string' ? content : JSON.stringify(content)
    const clean = text.replace(/<[^>]*>/g, '')
    const cjk = (clean.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
    const eng = (clean.match(/[a-zA-Z]+/g) || []).length
    return cjk + eng
}

function flattenTree(items) {
    const files = []
    const walk = (list) => {
        list.forEach(item => {
            if (item.children) walk(item.children)
            else files.push(item)
        })
    }
    walk(items || [])
    return files
}

function formatDate(ts) {
    const d = new Date(ts)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

// ─── Stat Card ───
function StatCard({ icon: Icon, label, value, accent, sub }) {
    return (
        <motion.div
            className="dash__stat-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="dash__stat-icon" style={{ color: accent }}>
                <Icon size={18} />
            </div>
            <div className="dash__stat-body">
                <span className="dash__stat-value">{value}</span>
                <span className="dash__stat-label">{label}</span>
                {sub && <span className="dash__stat-sub">{sub}</span>}
            </div>
        </motion.div>
    )
}

// ─── Component ───
export default function DashboardPanel() {
    const { project, openFiles, storyBible } = useAppState()
    const { openFile, setActivePanel, selectBibleEntry } = useAppActions()

    const [dailyGoal] = useState(() => {
        try { return parseInt(localStorage.getItem('arcwriter_focus_goal') || '500') }
        catch { return 500 }
    })

    // Compute project stats
    const stats = useMemo(() => {
        if (!project?.tree) return null

        const allFiles = flattenTree(project.tree)
        const novels = allFiles.filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'))
        const screenplays = allFiles.filter(f => f.name.endsWith('.arc'))
        const otherFiles = allFiles.filter(f => !f.name.endsWith('.md') && !f.name.endsWith('.txt') && !f.name.endsWith('.arc'))

        // Word counts from open files
        let totalWords = 0
        openFiles.forEach(f => {
            totalWords += countWords(f.content)
        })

        // Story bible stats
        const entries = storyBible?.entries || []
        const characters = entries.filter(e => e.category === 'characters')
        const locations = entries.filter(e => e.category === 'locations')
        const categories = storyBible?.categories || []

        return {
            totalFiles: allFiles.length,
            novelCount: novels.length,
            screenplayCount: screenplays.length,
            otherFiles: otherFiles.length,
            totalWords,
            openCount: openFiles.length,
            characterCount: characters.length,
            locationCount: locations.length,
            totalEntries: entries.length,
            categoryCount: categories.length,
            novelFiles: novels,
            screenplayFiles: screenplays,
            characterEntries: characters,
        }
    }, [project?.tree, openFiles, storyBible])

    if (!project) {
        return (
            <div className="dash__empty">
                <BarChart3 size={28} />
                <p>開啟專案以檢視儀表板</p>
            </div>
        )
    }

    return (
        <div className="dash">
            {/* Header */}
            <div className="dash__header">
                <Folder size={14} />
                <h3 className="dash__title">{project.name}</h3>
            </div>

            {/* Stats Grid */}
            <div className="dash__stats-grid">
                <StatCard
                    icon={FileText}
                    label="小說檔案"
                    value={stats?.novelCount ?? 0}
                    accent="#b8965a"
                />
                <StatCard
                    icon={Film}
                    label="劇本檔案"
                    value={stats?.screenplayCount ?? 0}
                    accent="#8b7ec9"
                />
                <StatCard
                    icon={PenLine}
                    label="總字數"
                    value={(stats?.totalWords ?? 0).toLocaleString()}
                    accent="#7fae8b"
                    sub="已開啟檔案"
                />
                <StatCard
                    icon={Users}
                    label="角色"
                    value={stats?.characterCount ?? 0}
                    accent="#c9563c"
                />
                <StatCard
                    icon={MapPin}
                    label="場景地點"
                    value={stats?.locationCount ?? 0}
                    accent="#5a9eb8"
                />
                <StatCard
                    icon={BookOpen}
                    label="設定條目"
                    value={stats?.totalEntries ?? 0}
                    accent="#c9963c"
                />
            </div>

            {/* Writing Goal */}
            <div className="dash__section">
                <div className="dash__section-header">
                    <Target size={13} />
                    <span>每日寫作目標</span>
                </div>
                <div className="dash__goal-card">
                    <div className="dash__goal-info">
                        <span className="dash__goal-target">{dailyGoal} 字 / 天</span>
                        <span className="dash__goal-hint">在專注模式中追蹤進度</span>
                    </div>
                </div>
            </div>

            {/* Recently opened files */}
            {openFiles.length > 0 && (
                <div className="dash__section">
                    <div className="dash__section-header">
                        <Clock size={13} />
                        <span>目前開啟的檔案</span>
                    </div>
                    <div className="dash__file-list">
                        {openFiles.slice(0, 8).map(f => {
                            const ext = f.name?.split('.').pop()?.toLowerCase()
                            const isArc = ext === 'arc'
                            const words = countWords(f.content)
                            return (
                                <button
                                    key={f.path}
                                    className="dash__file-item"
                                    onClick={() => openFile(f.path, f.name)}
                                >
                                    {isArc ? <Film size={12} /> : <FileText size={12} />}
                                    <span className="dash__file-name">{f.name}</span>
                                    <span className="dash__file-words">{words.toLocaleString()} 字</span>
                                    {f.modified && <span className="dash__file-modified">●</span>}
                                    <ChevronRight size={11} className="dash__file-arrow" />
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Characters quick access */}
            {stats?.characterEntries?.length > 0 && (
                <div className="dash__section">
                    <div className="dash__section-header">
                        <Users size={13} />
                        <span>角色一覽</span>
                        <button
                            className="dash__section-link"
                            onClick={() => setActivePanel('bible')}
                        >
                            查看全部
                        </button>
                    </div>
                    <div className="dash__character-grid">
                        {stats.characterEntries.slice(0, 8).map(ch => (
                            <button
                                key={ch.id}
                                className="dash__char-card"
                                onClick={() => {
                                    setActivePanel('bible')
                                    selectBibleEntry(ch.id)
                                }}
                            >
                                <div className="dash__char-avatar">
                                    {ch.title?.charAt(0) || '?'}
                                </div>
                                <span className="dash__char-name">{ch.title}</span>
                                {ch.subtitle && (
                                    <span className="dash__char-sub">{ch.subtitle}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Project files overview */}
            <div className="dash__section">
                <div className="dash__section-header">
                    <TrendingUp size={13} />
                    <span>專案概覽</span>
                </div>
                <div className="dash__overview-list">
                    <div className="dash__overview-row">
                        <span>檔案總數</span>
                        <span>{stats?.totalFiles ?? 0}</span>
                    </div>
                    <div className="dash__overview-row">
                        <span>故事聖經分類</span>
                        <span>{stats?.categoryCount ?? 0}</span>
                    </div>
                    <div className="dash__overview-row">
                        <span>目前開啟</span>
                        <span>{stats?.openCount ?? 0} 個檔案</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
