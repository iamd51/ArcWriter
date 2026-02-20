import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    ArrowLeft, Edit3, Tag, Link2, Image as ImageIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import { getFieldTemplate } from '../services/storyBibleService'
import { getCategoryIcon } from './StoryBiblePanel'
import '../styles/entryviewer.css'

/**
 * Read-only viewer for Story Bible entries.
 * Shows all fields as a nicely formatted card layout.
 */
export default function EntryViewer() {
    const { storyBible, selectedEntryId, project } = useAppState()
    const { selectBibleEntry, setEntryViewMode } = useAppActions()

    const [lightboxSrc, setLightboxSrc] = useState(null)
    const [resolvedImages, setResolvedImages] = useState({}) // relativePath -> file:// URL

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

    // Resolve image paths to file:// URLs
    useEffect(() => {
        if (!entry || !project?.path) return
        const toResolve = []

        // Collect avatar
        if (entry.avatar) toResolve.push(entry.avatar)

        // Collect gallery images from fields
        fieldTemplate.forEach(f => {
            if (f.type === 'image' && Array.isArray(entry.fields?.[f.key])) {
                entry.fields[f.key].forEach(p => toResolve.push(p))
            }
        })

        if (toResolve.length === 0) return

        const resolver = async () => {
            const map = {}
            for (const relPath of toResolve) {
                if (resolvedImages[relPath]) {
                    map[relPath] = resolvedImages[relPath]
                } else {
                    const url = await window.electronAPI.resolveBibleImage(project.path, relPath)
                    if (url) map[relPath] = url
                }
            }
            setResolvedImages(prev => ({ ...prev, ...map }))
        }
        resolver()
    }, [entry, project?.path, fieldTemplate]) // eslint-disable-line

    const handleNavigateToEntry = useCallback((entryId) => {
        selectBibleEntry(entryId)
        // Mode will reset to 'view' via the reducer
    }, [selectBibleEntry])

    if (!entry || !category) return null

    const Icon = getCategoryIcon(category.icon)
    const fields = entry.fields || {}
    const relationships = fields.relationships || []

    // Separate fields by type
    const shortFields = fieldTemplate.filter(f => f.type === 'short')
    const longFields = fieldTemplate.filter(f => f.type === 'long' && f.key !== 'notes')
    const structuredFields = fieldTemplate.filter(f => f.type === 'structured')
    const imageFields = fieldTemplate.filter(f => f.type === 'image')
    const notesField = fieldTemplate.find(f => f.key === 'notes')

    // Helper: get sub-field list for a structured field
    const getSubFields = (fieldKey) => {
        const data = fields[fieldKey]
        if (data && typeof data === 'object' && Array.isArray(data._subFields)) {
            return data._subFields
        }
        const def = fieldTemplate.find(f => f.key === fieldKey)
        return def?.subFields || []
    }

    return (
        <motion.div
            className="entry-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
        >
            {/* Header */}
            <div className="entry-viewer__header">
                <div className="entry-viewer__header-left">
                    <button
                        className="entry-viewer__back"
                        onClick={() => selectBibleEntry(null)}
                    >
                        <ArrowLeft size={15} />
                        <span>返回</span>
                    </button>
                </div>
                <button
                    className="entry-viewer__edit-btn"
                    onClick={() => setEntryViewMode('edit')}
                >
                    <Edit3 size={13} />
                    <span>編輯</span>
                </button>
            </div>

            <div className="entry-viewer__scroll">
                {/* Hero / Identity */}
                <div className="entry-viewer__hero">
                    <div
                        className="entry-viewer__avatar"
                        style={{ borderColor: category.color }}
                    >
                        {entry.avatar && resolvedImages[entry.avatar] ? (
                            <img
                                src={resolvedImages[entry.avatar]}
                                alt={entry.title}
                                onClick={() => setLightboxSrc(resolvedImages[entry.avatar])}
                                style={{ cursor: 'pointer' }}
                            />
                        ) : (
                            <Icon size={36} style={{ color: category.color }} />
                        )}
                    </div>
                    <div className="entry-viewer__info">
                        <h1 className="entry-viewer__title">
                            {entry.title || '新條目'}
                        </h1>
                        {entry.subtitle && (
                            <p className="entry-viewer__subtitle">
                                {entry.subtitle}
                            </p>
                        )}
                        <div className="entry-viewer__meta">
                            <span
                                className="entry-viewer__cat-badge"
                                style={{ color: category.color, borderColor: category.color }}
                            >
                                <Icon size={11} />
                                {category.label}
                            </span>
                            <span className="entry-viewer__date">
                                建立: {new Date(entry.createdAt).toLocaleDateString('zh-TW')}
                            </span>
                            {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                                <span className="entry-viewer__date">
                                    更新: {new Date(entry.updatedAt).toLocaleDateString('zh-TW')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tags */}
                {entry.tags?.length > 0 && (
                    <div className="entry-viewer__tags">
                        {entry.tags.map(tag => (
                            <span key={tag} className="entry-viewer__tag">
                                <Tag size={10} />
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Short fields in 2-column grid */}
                {shortFields.length > 0 && (
                    <div className="entry-viewer__short-fields">
                        {shortFields.map(field => (
                            <div key={field.key} className="entry-viewer__field-card">
                                <div className="entry-viewer__field-label">
                                    {field.label}
                                </div>
                                <div className={`entry-viewer__field-value ${!fields[field.key] ? 'entry-viewer__field-value--empty' : ''}`}>
                                    {fields[field.key] || '未填寫'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Long text fields */}
                <div className="entry-viewer__fields">
                    {longFields.map(field => {
                        const value = fields[field.key]
                        if (!value) return null // Hide empty long fields in view mode
                        return (
                            <div key={field.key} className="entry-viewer__field-card">
                                <div className="entry-viewer__field-label">
                                    {field.label}
                                </div>
                                <div className="entry-viewer__field-value">
                                    {value}
                                </div>
                            </div>
                        )
                    })}

                    {/* Structured Fields (appearance, abilities, etc.) */}
                    {structuredFields.map(field => {
                        const data = fields[field.key]
                        if (!data) return null
                        const isLegacy = typeof data === 'string'
                        const subFields = getSubFields(field.key)

                        // Check if any sub-field has a value
                        const hasContent = isLegacy
                            ? !!data
                            : subFields.some(sf => data[sf.key])
                        if (!hasContent) return null

                        return (
                            <div key={field.key} className="entry-viewer__field-card">
                                <div className="entry-viewer__field-label">
                                    {field.label}
                                </div>
                                {isLegacy ? (
                                    <div className="entry-viewer__field-value">
                                        {data}
                                    </div>
                                ) : (
                                    <div className="entry-viewer__structured-grid">
                                        {subFields.map(sf => {
                                            const val = data[sf.key]
                                            if (!val) return null
                                            return (
                                                <div key={sf.key} className="entry-viewer__structured-row">
                                                    <span className="entry-viewer__structured-key">
                                                        {sf.label}
                                                    </span>
                                                    <span className="entry-viewer__structured-val">
                                                        {val}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Image Gallery Fields */}
                    {imageFields.map(field => {
                        const images = Array.isArray(fields[field.key]) ? fields[field.key] : []
                        if (images.length === 0) return null
                        return (
                            <div key={field.key} className="entry-viewer__field-card">
                                <div className="entry-viewer__field-label">
                                    <ImageIcon size={11} />
                                    {field.label}
                                </div>
                                <div className="entry-viewer__gallery">
                                    {images.map((imgPath, idx) => (
                                        <div
                                            key={idx}
                                            className="entry-viewer__gallery-item"
                                            onClick={() => setLightboxSrc(resolvedImages[imgPath])}
                                        >
                                            {resolvedImages[imgPath] && (
                                                <img src={resolvedImages[imgPath]} alt="" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {/* Relationships */}
                    {relationships.length > 0 && (
                        <div className="entry-viewer__field-card">
                            <div className="entry-viewer__field-label">
                                <Link2 size={11} />
                                關聯條目
                            </div>
                            <div className="entry-viewer__rels">
                                {relationships.map((rel, idx) => {
                                    const target = storyBible?.entries?.find(e => e.id === rel.targetId)
                                    if (!target) return null
                                    const targetCat = storyBible?.categories?.find(c => c.id === target.category)
                                    const TargetIcon = getCategoryIcon(targetCat?.icon)
                                    return (
                                        <div
                                            key={idx}
                                            className="entry-viewer__rel"
                                            onClick={() => handleNavigateToEntry(target.id)}
                                        >
                                            <TargetIcon
                                                size={14}
                                                style={{ color: targetCat?.color || '#888' }}
                                            />
                                            <span className="entry-viewer__rel-name">
                                                {target.title}
                                            </span>
                                            {rel.label && (
                                                <span className="entry-viewer__rel-label">
                                                    {rel.label}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {notesField && fields[notesField.key] && (
                        <div className="entry-viewer__field-card">
                            <div className="entry-viewer__field-label">
                                {notesField.label}
                            </div>
                            <div className="entry-viewer__field-value">
                                {fields[notesField.key]}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxSrc && (
                <div
                    className="entry-viewer__lightbox"
                    onClick={() => setLightboxSrc(null)}
                >
                    <img src={lightboxSrc} alt="" />
                </div>
            )}
        </motion.div>
    )
}
