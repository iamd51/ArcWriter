import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
    ArrowLeft, Tag, X, Plus, Link2, Trash2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import { getFieldTemplate } from '../services/storyBibleService'
import { getCategoryIcon } from './StoryBiblePanel'
import '../styles/entryeditor.css'

/**
 * Full-page entry editor for Story Bible entries.
 * Renders dynamic form fields based on category template.
 */
export default function EntryEditor() {
    const { storyBible, selectedEntryId } = useAppState()
    const { updateBibleEntry, selectBibleEntry } = useAppActions()

    const entry = useMemo(
        () => storyBible?.entries?.find(e => e.id === selectedEntryId),
        [storyBible, selectedEntryId]
    )

    const category = useMemo(
        () => storyBible?.categories?.find(c => c.id === entry?.category),
        [storyBible, entry?.category]
    )

    const fieldTemplate = useMemo(
        () => entry ? getFieldTemplate(entry.category) : [],
        [entry]
    )

    // Local state for debounced saving
    const [localFields, setLocalFields] = useState({})
    const [localTitle, setLocalTitle] = useState('')
    const [localSubtitle, setLocalSubtitle] = useState('')
    const [tagInput, setTagInput] = useState('')
    const [showRelPicker, setShowRelPicker] = useState(false)
    const saveTimer = useRef(null)

    // Sync local state when entry changes
    useEffect(() => {
        if (entry) {
            setLocalTitle(entry.title || '')
            setLocalSubtitle(entry.subtitle || '')
            setLocalFields(entry.fields || {})
        }
    }, [selectedEntryId]) // eslint-disable-line

    // Debounced save
    const scheduleSave = useCallback((changes) => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
            updateBibleEntry(selectedEntryId, changes)
        }, 800)
    }, [selectedEntryId, updateBibleEntry])

    // Cleanup
    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current)
        }
    }, [])

    const handleTitleChange = useCallback((value) => {
        setLocalTitle(value)
        scheduleSave({ title: value })
    }, [scheduleSave])

    const handleSubtitleChange = useCallback((value) => {
        setLocalSubtitle(value)
        scheduleSave({ subtitle: value })
    }, [scheduleSave])

    const handleFieldChange = useCallback((key, value) => {
        setLocalFields(prev => {
            const updated = { ...prev, [key]: value }
            scheduleSave({ fields: updated })
            return updated
        })
    }, [scheduleSave])

    // Tag management
    const handleAddTag = useCallback(() => {
        if (!tagInput.trim() || !entry) return
        const tags = [...(entry.tags || []), tagInput.trim()]
        updateBibleEntry(selectedEntryId, { tags })
        setTagInput('')
    }, [tagInput, entry, selectedEntryId, updateBibleEntry])

    const handleRemoveTag = useCallback((tag) => {
        if (!entry) return
        const tags = (entry.tags || []).filter(t => t !== tag)
        updateBibleEntry(selectedEntryId, { tags })
    }, [entry, selectedEntryId, updateBibleEntry])

    const handleTagKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddTag()
        }
    }, [handleAddTag])

    // Relationship management
    const allEntries = storyBible?.entries || []
    const relationships = (localFields.relationships || [])
    const otherEntries = allEntries.filter(e => e.id !== selectedEntryId)

    const handleAddRelationship = useCallback((targetId) => {
        const target = allEntries.find(e => e.id === targetId)
        if (!target) return
        const rels = [...relationships, { targetId, label: '' }]
        handleFieldChange('relationships', rels)
        setShowRelPicker(false)
    }, [relationships, allEntries, handleFieldChange])

    const handleUpdateRelLabel = useCallback((idx, label) => {
        const rels = [...relationships]
        rels[idx] = { ...rels[idx], label }
        handleFieldChange('relationships', rels)
    }, [relationships, handleFieldChange])

    const handleRemoveRelationship = useCallback((idx) => {
        const rels = relationships.filter((_, i) => i !== idx)
        handleFieldChange('relationships', rels)
    }, [relationships, handleFieldChange])

    if (!entry || !category) return null

    const Icon = getCategoryIcon(category.icon)

    // Filter fieldTemplate to exclude 'relationships' (handled separately)
    const formFields = fieldTemplate.filter(f => f.key !== 'notes')
    const notesField = fieldTemplate.find(f => f.key === 'notes')

    return (
        <motion.div
            className="entry-editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
        >
            {/* Header */}
            <div className="entry-editor__header">
                <button
                    className="entry-editor__back"
                    onClick={() => selectBibleEntry(null)}
                >
                    <ArrowLeft size={15} />
                    <span>返回</span>
                </button>
            </div>

            <div className="entry-editor__scroll">
                {/* Identity Section */}
                <div className="entry-editor__identity">
                    <div
                        className="entry-editor__avatar"
                        style={{ borderColor: category.color }}
                    >
                        <Icon size={28} style={{ color: category.color }} />
                    </div>
                    <div className="entry-editor__identity-info">
                        <input
                            className="entry-editor__title-input"
                            value={localTitle}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="條目名稱"
                        />
                        <input
                            className="entry-editor__subtitle-input"
                            value={localSubtitle}
                            onChange={(e) => handleSubtitleChange(e.target.value)}
                            placeholder="副標題 (如：主角 · 騎士團長)"
                        />
                        <div className="entry-editor__meta">
                            <span
                                className="entry-editor__cat-badge"
                                style={{ color: category.color, borderColor: category.color }}
                            >
                                <Icon size={10} />
                                {category.label}
                            </span>
                            <span className="entry-editor__date">
                                建立: {new Date(entry.createdAt).toLocaleDateString('zh-TW')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tags */}
                <div className="entry-editor__section">
                    <div className="entry-editor__section-title">
                        <Tag size={12} />
                        標籤
                    </div>
                    <div className="entry-editor__tags">
                        {(entry.tags || []).map(tag => (
                            <span key={tag} className="entry-editor__tag">
                                {tag}
                                <button
                                    className="entry-editor__tag-remove"
                                    onClick={() => handleRemoveTag(tag)}
                                >
                                    <X size={9} />
                                </button>
                            </span>
                        ))}
                        <div className="entry-editor__tag-add">
                            <input
                                className="entry-editor__tag-input"
                                placeholder="新增標籤…"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                            />
                            <button
                                className="entry-editor__tag-btn"
                                onClick={handleAddTag}
                            >
                                <Plus size={11} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dynamic Form Fields */}
                {formFields.map(field => (
                    <div key={field.key} className="entry-editor__section">
                        <div className="entry-editor__section-title">
                            {field.label}
                        </div>
                        {field.type === 'long' ? (
                            <textarea
                                className="entry-editor__textarea"
                                value={localFields[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                placeholder={`輸入${field.label}…`}
                                rows={4}
                            />
                        ) : (
                            <input
                                className="entry-editor__input"
                                value={localFields[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                placeholder={`輸入${field.label}…`}
                            />
                        )}
                    </div>
                ))}

                {/* Relationships */}
                <div className="entry-editor__section">
                    <div className="entry-editor__section-title">
                        <Link2 size={12} />
                        關聯條目
                    </div>
                    <div className="entry-editor__rels">
                        {relationships.map((rel, idx) => {
                            const target = allEntries.find(e => e.id === rel.targetId)
                            if (!target) return null
                            const targetCat = storyBible?.categories?.find(c => c.id === target.category)
                            const TargetIcon = getCategoryIcon(targetCat?.icon)
                            return (
                                <div key={idx} className="entry-editor__rel">
                                    <TargetIcon
                                        size={13}
                                        style={{ color: targetCat?.color || '#888' }}
                                    />
                                    <span className="entry-editor__rel-name">
                                        {target.title}
                                    </span>
                                    <input
                                        className="entry-editor__rel-label"
                                        value={rel.label}
                                        onChange={(e) => handleUpdateRelLabel(idx, e.target.value)}
                                        placeholder="關係描述 (如：宿敵、摯友)"
                                    />
                                    <button
                                        className="entry-editor__rel-del"
                                        onClick={() => handleRemoveRelationship(idx)}
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            )
                        })}

                        <div className="entry-editor__rel-add">
                            <button
                                className="entry-editor__rel-btn"
                                onClick={() => setShowRelPicker(prev => !prev)}
                            >
                                <Plus size={12} />
                                新增關聯
                            </button>

                            {showRelPicker && otherEntries.length > 0 && (
                                <div className="entry-editor__rel-picker">
                                    {otherEntries.map(e => {
                                        const eCat = storyBible?.categories?.find(c => c.id === e.category)
                                        const EIcon = getCategoryIcon(eCat?.icon)
                                        return (
                                            <button
                                                key={e.id}
                                                className="entry-editor__rel-option"
                                                onClick={() => handleAddRelationship(e.id)}
                                            >
                                                <EIcon size={12} style={{ color: eCat?.color }} />
                                                <span>{e.title || '新條目'}</span>
                                                <span className="entry-editor__rel-cat">{eCat?.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {notesField && (
                    <div className="entry-editor__section">
                        <div className="entry-editor__section-title">
                            {notesField.label}
                        </div>
                        <textarea
                            className="entry-editor__textarea"
                            value={localFields[notesField.key] || ''}
                            onChange={(e) => handleFieldChange(notesField.key, e.target.value)}
                            placeholder="備註、靈感筆記…"
                            rows={5}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    )
}
