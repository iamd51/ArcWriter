import { Files, Search, BookOpen, Sparkles, Settings, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/activitybar.css'

const panels = [
    { id: 'files', icon: Files, label: '檔案' },
    { id: 'search', icon: Search, label: '搜尋' },
    { id: 'bible', icon: BookOpen, label: '故事聖經' },
    { id: 'ai', icon: Sparkles, label: 'AI 助手' },
]

const bottomItems = [
    { id: 'settings', icon: Settings, label: '設定' },
]

export default function ActivityBar() {
    const { activePanel, sidebarVisible, theme } = useAppState()
    const { setActivePanel, toggleTheme } = useAppActions()

    const isActive = (id) => activePanel === id && sidebarVisible
    const ThemeIcon = theme === 'dark' ? Sun : Moon

    return (
        <motion.div
            className="activitybar"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="activitybar__top">
                {panels.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        className={`activitybar__item ${isActive(id) ? 'activitybar__item--active' : ''}`}
                        onClick={() => setActivePanel(id)}
                        title={label}
                    >
                        <Icon size={20} strokeWidth={1.6} />
                    </button>
                ))}
            </div>

            <div className="activitybar__spacer" />

            <div className="activitybar__bottom">
                <button
                    className="activitybar__item"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? '切換淺色主題' : '切換深色主題'}
                >
                    <ThemeIcon size={18} strokeWidth={1.6} />
                </button>
                {bottomItems.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        className={`activitybar__item ${isActive(id) ? 'activitybar__item--active' : ''}`}
                        onClick={() => setActivePanel(id)}
                        title={label}
                    >
                        <Icon size={20} strokeWidth={1.6} />
                    </button>
                ))}
            </div>
        </motion.div>
    )
}

