import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
    ArrowLeft, Tag, X, Plus, Link2, Trash2, Upload, Image as ImageIcon,
    Settings, GripVertical,
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
    const { storyBible, selectedEntryId, project } = useAppState()
    const { updateBibleEntry, selectBibleEntry, setEntryViewMode } = useAppActions()

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
    const [resolvedImages, setResolvedImages] = useState({})
    const [editingSubFields, setEditingSubFields] = useState(null) // fieldKey or null
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

    // ═══ Avatar upload ═══
    const handleAvatarClick = useCallback(async () => {
        if (!project?.path || !entry) return
        const result = await window.electronAPI.pickBibleImage(project.path, entry.id)
        if (result?.ok && result.paths?.length > 0) {
            updateBibleEntry(selectedEntryId, { avatar: result.paths[0] })
            // Resolve URL immediately
            const url = await window.electronAPI.resolveBibleImage(project.path, result.paths[0])
            if (url) setResolvedImages(prev => ({ ...prev, [result.paths[0]]: url }))
        }
    }, [project?.path, entry, selectedEntryId, updateBibleEntry])

    // ═══ Image field pick/delete ═══
    const handlePickImages = useCallback(async (fieldKey) => {
        if (!project?.path || !entry) return
        const result = await window.electronAPI.pickBibleImage(project.path, entry.id)
        if (result?.ok && result.paths?.length > 0) {
            const current = Array.isArray(localFields[fieldKey]) ? localFields[fieldKey] : []
            const updated = [...current, ...result.paths]
            handleFieldChange(fieldKey, updated)
            // Resolve URLs
            for (const p of result.paths) {
                const url = await window.electronAPI.resolveBibleImage(project.path, p)
                if (url) setResolvedImages(prev => ({ ...prev, [p]: url }))
            }
        }
    }, [project?.path, entry, localFields, handleFieldChange])

    const handleDeleteImage = useCallback(async (fieldKey, imgPath) => {
        if (!project?.path) return
        await window.electronAPI.deleteBibleImage(project.path, imgPath)
        const current = Array.isArray(localFields[fieldKey]) ? localFields[fieldKey] : []
        const updated = current.filter(p => p !== imgPath)
        handleFieldChange(fieldKey, updated)
        setResolvedImages(prev => {
            const copy = { ...prev }
            delete copy[imgPath]
            return copy
        })
    }, [project?.path, localFields, handleFieldChange])

    // ═══ Resolve existing image paths on entry load ═══
    useEffect(() => {
        if (!entry || !project?.path) return
        const toResolve = []
        if (entry.avatar) toResolve.push(entry.avatar)
        fieldTemplate.forEach(f => {
            if (f.type === 'image' && Array.isArray(entry.fields?.[f.key])) {
                entry.fields[f.key].forEach(p => toResolve.push(p))
            }
        })
        if (toResolve.length === 0) return
        const resolver = async () => {
            const map = {}
            for (const relPath of toResolve) {
                const url = await window.electronAPI.resolveBibleImage(project.path, relPath)
                if (url) map[relPath] = url
            }
            setResolvedImages(prev => ({ ...prev, ...map }))
        }
        resolver()
    }, [selectedEntryId, project?.path]) // eslint-disable-line

    if (!entry || !category) return null

    const Icon = getCategoryIcon(category.icon)

    // Filter fieldTemplate to separate by type
    const formFields = fieldTemplate.filter(f => f.key !== 'notes' && f.type !== 'image' && f.type !== 'structured')
    const structuredFieldDefs = fieldTemplate.filter(f => f.type === 'structured')
    const imageFieldDefs = fieldTemplate.filter(f => f.type === 'image')
    const notesField = fieldTemplate.find(f => f.key === 'notes')

    // ═══ Structured field helpers ═══
    const getSubFields = (fieldKey) => {
        const data = localFields[fieldKey]
        if (data && typeof data === 'object' && Array.isArray(data._subFields)) {
            return data._subFields
        }
        // Find default from template
        const def = fieldTemplate.find(f => f.key === fieldKey)
        return def?.subFields || []
    }

    const handleStructuredChange = (fieldKey, subKey, value) => {
        const current = (typeof localFields[fieldKey] === 'object' && localFields[fieldKey]) || {}
        const updated = { ...current, [subKey]: value }
        handleFieldChange(fieldKey, updated)
    }

    const handleAddSubField = (fieldKey) => {
        const data = (typeof localFields[fieldKey] === 'object' && localFields[fieldKey]) || {}
        const subs = data._subFields ? [...data._subFields] : []
        const newKey = `custom_${Date.now()}`
        subs.push({ key: newKey, label: '新欄位', placeholder: '' })
        handleFieldChange(fieldKey, { ...data, _subFields: subs, [newKey]: '' })
    }

    const handleRenameSubField = (fieldKey, subKey, newLabel) => {
        const data = (typeof localFields[fieldKey] === 'object' && localFields[fieldKey]) || {}
        const subs = (data._subFields || []).map(sf =>
            sf.key === subKey ? { ...sf, label: newLabel } : sf
        )
        handleFieldChange(fieldKey, { ...data, _subFields: subs })
    }

    const handleDeleteSubField = (fieldKey, subKey) => {
        const data = (typeof localFields[fieldKey] === 'object' && localFields[fieldKey]) || {}
        const subs = (data._subFields || []).filter(sf => sf.key !== subKey)
        const { [subKey]: _removed, ...rest } = data
        handleFieldChange(fieldKey, { ...rest, _subFields: subs })
    }

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
                    onClick={() => setEntryViewMode('view')}
                >
                    <ArrowLeft size={15} />
                    <span>返回檢視</span>
                </button>
            </div>

            <div className="entry-editor__scroll">
                {/* Identity Section */}
                <div className="entry-editor__identity">
                    <div
                        className="entry-editor__avatar entry-editor__avatar--clickable"
                        style={{ borderColor: category.color }}
                        onClick={handleAvatarClick}
                        title="點擊上傳頭像"
                    >
                        {entry.avatar && resolvedImages[entry.avatar] ? (
                            <img
                                src={resolvedImages[entry.avatar]}
                                alt={entry.title}
                                className="entry-editor__avatar-img"
                            />
                        ) : (
                            <>
                                <Icon size={28} style={{ color: category.color }} />
                                <div className="entry-editor__avatar-overlay">
                                    <Upload size={16} />
                                </div>
                            </>
                        )}
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

                {/* Structured Fields (appearance, abilities, etc.) */}
                {structuredFieldDefs.map(field => {
                    const data = localFields[field.key]
                    const isLegacyString = typeof data === 'string'
                    const subFields = getSubFields(field.key)
                    const isEditing = editingSubFields === field.key

                    return (
                        <div key={field.key} className="entry-editor__section">
                            <div className="entry-editor__section-title">
                                {field.label}
                                <button
                                    className={`entry-editor__subfield-gear ${isEditing ? 'entry-editor__subfield-gear--active' : ''}`}
                                    onClick={() => setEditingSubFields(isEditing ? null : field.key)}
                                    title="管理子欄位"
                                >
                                    <Settings size={13} />
                                </button>
                            </div>

                            {/* Sub-field management panel */}
                            {isEditing && (
                                <div className="entry-editor__subfield-mgr">
                                    <div className="entry-editor__subfield-mgr-title">管理子欄位</div>
                                    {subFields.map(sf => (
                                        <div key={sf.key} className="entry-editor__subfield-mgr-row">
                                            <GripVertical size={12} className="entry-editor__subfield-grip" />
                                            <input
                                                className="entry-editor__subfield-mgr-input"
                                                value={sf.label}
                                                onChange={(e) => handleRenameSubField(field.key, sf.key, e.target.value)}
                                            />
                                            <button
                                                className="entry-editor__subfield-mgr-del"
                                                onClick={() => handleDeleteSubField(field.key, sf.key)}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="entry-editor__subfield-mgr-add"
                                        onClick={() => handleAddSubField(field.key)}
                                    >
                                        <Plus size={13} />
                                        新增子欄位
                                    </button>
                                </div>
                            )}

                            {/* Render sub-fields or legacy string */}
                            {isLegacyString ? (
                                <div className="entry-editor__subfield-legacy">
                                    <div className="entry-editor__subfield-legacy-label">舊資料（尚未轉換為結構化格式）</div>
                                    <textarea
                                        className="entry-editor__textarea"
                                        value={data}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            ) : (
                                <div className="entry-editor__subfield-grid">
                                    {subFields.map(sf => (
                                        <div key={sf.key} className="entry-editor__subfield-row">
                                            <label className="entry-editor__subfield-label">
                                                {sf.label}
                                            </label>
                                            <input
                                                className="entry-editor__subfield-input"
                                                value={(data && data[sf.key]) || ''}
                                                onChange={(e) => handleStructuredChange(field.key, sf.key, e.target.value)}
                                                placeholder={sf.placeholder || `輸入${sf.label}…`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Image Fields */}
                {imageFieldDefs.map(field => {
                    const images = Array.isArray(localFields[field.key]) ? localFields[field.key] : []
                    return (
                        <div key={field.key} className="entry-editor__section">
                            <div className="entry-editor__section-title">
                                <ImageIcon size={12} />
                                {field.label}
                            </div>
                            <div className="entry-editor__image-grid">
                                {images.map((imgPath, idx) => (
                                    <div key={idx} className="entry-editor__image-item">
                                        {resolvedImages[imgPath] && (
                                            <img src={resolvedImages[imgPath]} alt="" />
                                        )}
                                        <button
                                            className="entry-editor__image-del"
                                            onClick={() => handleDeleteImage(field.key, imgPath)}
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className="entry-editor__image-add"
                                    onClick={() => handlePickImages(field.key)}
                                >
                                    <Plus size={18} />
                                    <span>新增圖片</span>
                                </button>
                            </div>
                        </div>
                    )
                })}

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
