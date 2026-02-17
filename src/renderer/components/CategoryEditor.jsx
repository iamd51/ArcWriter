import { useState, useCallback } from 'react'
import {
    X, Plus, Trash2, GripVertical,
    User, Users, MapPin, Map, Shield, Sword,
    Gem, Crown, Calendar, Clock, Globe, BookOpen,
    Scroll, Flag, Heart, Star, Zap, Eye,
    Feather, Compass, Mountain, TreePine,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_ICONS, CATEGORY_COLORS, createCategory } from '../services/storyBibleService'

const ICON_COMPONENTS = {
    'user': User, 'users': Users, 'map-pin': MapPin, 'map': Map,
    'shield': Shield, 'sword': Sword, 'gem': Gem, 'crown': Crown,
    'calendar': Calendar, 'clock': Clock, 'globe': Globe, 'book-open': BookOpen,
    'scroll': Scroll, 'flag': Flag, 'heart': Heart, 'star': Star,
    'zap': Zap, 'eye': Eye, 'feather': Feather, 'compass': Compass,
    'mountain': Mountain, 'tree-pine': TreePine,
}

/**
 * Dialog for managing (add/edit/delete) Story Bible categories.
 */
export default function CategoryEditor({ isOpen, onClose, categories, onSave }) {
    const [items, setItems] = useState([])
    const [editingId, setEditingId] = useState(null)
    const [showIconPicker, setShowIconPicker] = useState(null) // category id
    const [showColorPicker, setShowColorPicker] = useState(null)

    // Sync local state when opening
    useState(() => {
        if (isOpen) setItems([...categories])
    })

    // Re-sync when dialog opens
    const handleOpen = useCallback(() => {
        setItems([...categories])
        setEditingId(null)
        setShowIconPicker(null)
        setShowColorPicker(null)
    }, [categories])

    // Create new custom category
    const handleAdd = useCallback(() => {
        const newCat = createCategory('新分類')
        setItems(prev => [...prev, newCat])
        setEditingId(newCat.id)
    }, [])

    const handleDelete = useCallback((catId) => {
        setItems(prev => prev.filter(c => c.id !== catId))
    }, [])

    const handleLabelChange = useCallback((catId, label) => {
        setItems(prev => prev.map(c => c.id === catId ? { ...c, label } : c))
    }, [])

    const handleIconChange = useCallback((catId, icon) => {
        setItems(prev => prev.map(c => c.id === catId ? { ...c, icon } : c))
        setShowIconPicker(null)
    }, [])

    const handleColorChange = useCallback((catId, color) => {
        setItems(prev => prev.map(c => c.id === catId ? { ...c, color } : c))
        setShowColorPicker(null)
    }, [])

    const handleSave = useCallback(() => {
        onSave(items)
        onClose()
    }, [items, onSave, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="cat-editor__overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onClick={onClose}
                    onAnimationStart={handleOpen}
                >
                    <motion.div
                        className="cat-editor"
                        initial={{ opacity: 0, y: -12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="cat-editor__header">
                            <h3 className="cat-editor__title">管理分類</h3>
                            <button className="cat-editor__close" onClick={onClose}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className="cat-editor__list">
                            {items.map((cat) => {
                                const Icon = ICON_COMPONENTS[cat.icon] || Star
                                return (
                                    <div key={cat.id} className="cat-editor__item">
                                        <GripVertical size={12} className="cat-editor__grip" />

                                        {/* Icon picker trigger */}
                                        <button
                                            className="cat-editor__icon-btn"
                                            onClick={() => setShowIconPicker(
                                                showIconPicker === cat.id ? null : cat.id
                                            )}
                                            style={{ color: cat.color }}
                                        >
                                            <Icon size={15} />
                                        </button>

                                        {/* Label input */}
                                        <input
                                            className="cat-editor__label-input"
                                            value={cat.label}
                                            onChange={(e) => handleLabelChange(cat.id, e.target.value)}
                                            autoFocus={editingId === cat.id}
                                        />

                                        {/* Color swatch */}
                                        <button
                                            className="cat-editor__color-btn"
                                            style={{ background: cat.color }}
                                            onClick={() => setShowColorPicker(
                                                showColorPicker === cat.id ? null : cat.id
                                            )}
                                        />

                                        <button
                                            className="cat-editor__del-btn"
                                            onClick={() => handleDelete(cat.id)}
                                            title="刪除分類"
                                        >
                                            <Trash2 size={12} />
                                        </button>

                                        {/* Icon picker dropdown */}
                                        {showIconPicker === cat.id && (
                                            <div className="cat-editor__picker cat-editor__icon-picker">
                                                {CATEGORY_ICONS.map(iconName => {
                                                    const Ic = ICON_COMPONENTS[iconName] || Star
                                                    return (
                                                        <button
                                                            key={iconName}
                                                            className={`cat-editor__picker-item ${cat.icon === iconName ? 'cat-editor__picker-item--active' : ''
                                                                }`}
                                                            onClick={() => handleIconChange(cat.id, iconName)}
                                                        >
                                                            <Ic size={14} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Color picker dropdown */}
                                        {showColorPicker === cat.id && (
                                            <div className="cat-editor__picker cat-editor__color-picker">
                                                {CATEGORY_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        className={`cat-editor__color-swatch ${cat.color === color ? 'cat-editor__color-swatch--active' : ''
                                                            }`}
                                                        style={{ background: color }}
                                                        onClick={() => handleColorChange(cat.id, color)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="cat-editor__footer">
                            <button className="cat-editor__add-btn" onClick={handleAdd}>
                                <Plus size={13} />
                                新增分類
                            </button>
                            <button className="cat-editor__save-btn" onClick={handleSave}>
                                儲存
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
