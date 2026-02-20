import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Plus, Search, ChevronDown, ChevronRight, Trash2, Settings2,
    User, Users, MapPin, Map, Shield, Sword,
    Gem, Crown, Calendar, Clock, Globe, BookOpen,
    Scroll, Flag, Heart, Star, Zap, Eye,
    Feather, Compass, Mountain, TreePine,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import CategoryEditor from './CategoryEditor'
import '../styles/storybible.css'

// Map icon names to lucide components
const ICON_MAP = {
    'user': User, 'users': Users, 'map-pin': MapPin, 'map': Map,
    'shield': Shield, 'sword': Sword, 'gem': Gem, 'crown': Crown,
    'calendar': Calendar, 'clock': Clock, 'globe': Globe, 'book-open': BookOpen,
    'scroll': Scroll, 'flag': Flag, 'heart': Heart, 'star': Star,
    'zap': Zap, 'eye': Eye, 'feather': Feather, 'compass': Compass,
    'mountain': Mountain, 'tree-pine': TreePine,
}

export function getCategoryIcon(iconName) {
    return ICON_MAP[iconName] || Star
}

export default function StoryBiblePanel() {
    const { storyBible, selectedEntryId, project, bibleLoaded } = useAppState()
    const { loadBible, createBibleEntry, selectBibleEntry, deleteBibleEntry, updateBibleCategories, setEntryViewMode } = useAppActions()

    const [searchQuery, setSearchQuery] = useState('')
    const [collapsed, setCollapsed] = useState({})
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [showCategoryEditor, setShowCategoryEditor] = useState(false)

    // Load bible when project changes
    useEffect(() => {
        if (project?.path && !bibleLoaded) {
            loadBible(project.path)
        }
    }, [project?.path, bibleLoaded, loadBible])

    const categories = storyBible?.categories || []
    const entries = storyBible?.entries || []

    // Group entries by category
    const grouped = useMemo(() => {
        const map = {}
        categories.forEach(cat => { map[cat.id] = [] })
        entries.forEach(entry => {
            if (map[entry.category]) {
                map[entry.category].push(entry)
            }
        })
        return map
    }, [categories, entries])

    // Filter by search
    const filteredGrouped = useMemo(() => {
        if (!searchQuery.trim()) return grouped
        const q = searchQuery.toLowerCase()
        const result = {}
        Object.entries(grouped).forEach(([catId, items]) => {
            const filtered = items.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.subtitle?.toLowerCase().includes(q) ||
                e.tags?.some(t => t.toLowerCase().includes(q))
            )
            if (filtered.length > 0) result[catId] = filtered
        })
        return result
    }, [grouped, searchQuery])

    const toggleCollapse = useCallback((catId) => {
        setCollapsed(prev => ({ ...prev, [catId]: !prev[catId] }))
    }, [])

    const handleAddEntry = useCallback(async (catId) => {
        setShowAddMenu(false)
        const entry = await createBibleEntry(catId, '')
        if (entry) {
            selectBibleEntry(entry.id)
            setEntryViewMode('edit') // New entries go straight to edit mode
        }
    }, [createBibleEntry, selectBibleEntry, setEntryViewMode])

    const handleDeleteEntry = useCallback((e, entryId) => {
        e.stopPropagation()
        deleteBibleEntry(entryId)
    }, [deleteBibleEntry])

    if (!project) {
        return <div className="bible-panel__empty">開啟專案後即可使用故事聖經</div>
    }

    return (
        <div className="bible-panel">
            {/* Search */}
            <div className="bible-panel__search">
                <Search size={13} className="bible-panel__search-icon" />
                <input
                    className="bible-panel__search-input"
                    placeholder="搜尋設定…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Quick Add + Category Manager */}
            <div className="bible-panel__toolbar">
                <div className="bible-panel__add-wrap">
                    <button
                        className="bible-panel__add-btn"
                        onClick={() => setShowAddMenu(prev => !prev)}
                    >
                        <Plus size={13} />
                        <span>新增</span>
                    </button>

                    <AnimatePresence>
                        {showAddMenu && (
                            <motion.div
                                className="bible-panel__add-menu"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.12 }}
                            >
                                {categories.map(cat => {
                                    const Icon = getCategoryIcon(cat.icon)
                                    return (
                                        <button
                                            key={cat.id}
                                            className="bible-panel__add-item"
                                            onClick={() => handleAddEntry(cat.id)}
                                        >
                                            <Icon size={13} style={{ color: cat.color }} />
                                            <span>{cat.label}</span>
                                        </button>
                                    )
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    className="bible-panel__manage-btn"
                    onClick={() => setShowCategoryEditor(true)}
                    title="管理分類"
                >
                    <Settings2 size={13} />
                </button>
            </div>

            {/* Category List */}
            <div className="bible-panel__list">
                {categories.map(cat => {
                    const items = filteredGrouped[cat.id] || []
                    const isCollapsed = collapsed[cat.id]
                    const Icon = getCategoryIcon(cat.icon)
                    const hasItems = grouped[cat.id]?.length > 0

                    // Skip categories with no matches when searching
                    if (searchQuery && !filteredGrouped[cat.id]) return null

                    return (
                        <div key={cat.id} className="bible-panel__category">
                            <button
                                className="bible-panel__cat-header"
                                onClick={() => toggleCollapse(cat.id)}
                            >
                                {isCollapsed
                                    ? <ChevronRight size={12} />
                                    : <ChevronDown size={12} />
                                }
                                <Icon size={13} style={{ color: cat.color }} />
                                <span className="bible-panel__cat-label">{cat.label}</span>
                                <span className="bible-panel__cat-count">{grouped[cat.id]?.length || 0}</span>
                            </button>

                            <AnimatePresence initial={false}>
                                {!isCollapsed && (
                                    <motion.div
                                        className="bible-panel__entries"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {items.map(entry => (
                                            <button
                                                key={entry.id}
                                                className={`bible-panel__entry ${selectedEntryId === entry.id ? 'bible-panel__entry--active' : ''
                                                    }`}
                                                onClick={() => selectBibleEntry(entry.id)}
                                                onDoubleClick={() => {
                                                    selectBibleEntry(entry.id)
                                                    setEntryViewMode('edit')
                                                }}
                                            >
                                                <span
                                                    className="bible-panel__entry-dot"
                                                    style={{ background: cat.color }}
                                                />
                                                <span className="bible-panel__entry-title">
                                                    {entry.title || '新條目'}
                                                </span>
                                                {entry.subtitle && (
                                                    <span className="bible-panel__entry-sub">
                                                        {entry.subtitle}
                                                    </span>
                                                )}
                                                <button
                                                    className="bible-panel__entry-del"
                                                    onClick={(e) => handleDeleteEntry(e, entry.id)}
                                                    title="刪除"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </button>
                                        ))}

                                        {!hasItems && !searchQuery && (
                                            <div className="bible-panel__no-items">
                                                尚無條目
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>

            {/* Category Editor Dialog */}
            <CategoryEditor
                isOpen={showCategoryEditor}
                onClose={() => setShowCategoryEditor(false)}
                categories={categories}
                onSave={updateBibleCategories}
            />
        </div>
    )
}
