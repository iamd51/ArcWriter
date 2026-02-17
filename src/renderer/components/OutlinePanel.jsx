import { useState, useMemo, useCallback } from 'react'
import {
    List, FileText, Film, ChevronDown, ChevronRight,
    Hash, AlignLeft, MessageSquare, Clapperboard,
    GripVertical,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import { parseScreenplayJSON } from './ScreenplayEditor'
import '../styles/outline.css'

// ── Parse novel (HTML/MD) headings as outline ──
function parseNovelOutline(content) {
    if (!content) return []
    const items = []

    // Look for h1-h6 tags, or lines that look like chapter headings
    const lines = content.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]*>/g, '').split('\n')
    let charCount = 0

    lines.forEach((line, idx) => {
        const trimmed = line.trim()
        charCount += trimmed.length

        // Chinese chapter patterns: 第X章, 第X節, 章節X
        const chapterMatch = trimmed.match(/^(第[一二三四五六七八九十百千\d]+[章節回卷篇幕]|Chapter\s+\d+|CHAPTER\s+\d+)/i)
        if (chapterMatch) {
            items.push({
                type: 'chapter',
                title: trimmed.slice(0, 60),
                lineIndex: idx,
                wordCount: 0,
            })
        }
        // Detect headings with format like "一、" "二、" etc.
        else if (/^[一二三四五六七八九十]+[、．.]/.test(trimmed)) {
            items.push({
                type: 'section',
                title: trimmed.slice(0, 60),
                lineIndex: idx,
                wordCount: 0,
            })
        }
    })

    // Calculate word counts between items
    for (let i = 0; i < items.length; i++) {
        const startLine = items[i].lineIndex
        const endLine = i + 1 < items.length ? items[i + 1].lineIndex : lines.length
        let wc = 0
        for (let j = startLine; j < endLine; j++) {
            const t = (lines[j] || '').trim()
            const cjk = (t.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
            const eng = (t.match(/[a-zA-Z]+/g) || []).length
            wc += cjk + eng
        }
        items[i].wordCount = wc
    }

    // If no chapters found, just show total as one section
    if (items.length === 0 && content.length > 0) {
        const totalCjk = (content.replace(/<[^>]*>/g, '').match(/[\u4e00-\u9fff]/g) || []).length
        const totalEng = (content.replace(/<[^>]*>/g, '').match(/[a-zA-Z]+/g) || []).length
        items.push({
            type: 'document',
            title: '（全文）',
            lineIndex: 0,
            wordCount: totalCjk + totalEng,
        })
    }

    return items
}

// ── Parse screenplay outline ──
function parseScreenplayOutline(content) {
    const data = parseScreenplayJSON(content)
    if (!data?.scenes) return []

    return data.scenes.map((scene, idx) => {
        const firstHeading = scene.rows?.find(r => r.heading)
        const dialogueCount = scene.rows?.filter(r => r.dialogue).length || 0
        const charSet = new Set()
        scene.rows?.forEach(r => { if (r.character) charSet.add(r.character) })

        let wc = 0
        scene.rows?.forEach(r => {
            Object.values(r).forEach(v => {
                if (typeof v === 'string') {
                    const clean = v.replace(/<[^>]*>/g, '')
                    wc += (clean.match(/[\u4e00-\u9fff]/g) || []).length
                    wc += (clean.match(/[a-zA-Z]+/g) || []).length
                }
            })
        })

        return {
            type: 'scene',
            title: firstHeading?.heading || `場景 ${idx + 1}`,
            sceneIndex: idx,
            rowCount: scene.rows?.length || 0,
            dialogueCount,
            characters: [...charSet],
            wordCount: wc,
        }
    })
}

export default function OutlinePanel() {
    const { activeFilePath, openFiles } = useAppState()
    const activeFile = openFiles.find(f => f.path === activeFilePath)
    const ext = activeFilePath?.split('.').pop()?.toLowerCase()
    const isScreenplay = ext === 'arc'

    const [expandedScene, setExpandedScene] = useState(null)

    const outline = useMemo(() => {
        if (!activeFile?.content) return []
        return isScreenplay
            ? parseScreenplayOutline(activeFile.content)
            : parseNovelOutline(activeFile.content)
    }, [activeFile?.content, isScreenplay])

    // Total stats
    const totalWords = useMemo(() =>
        outline.reduce((sum, item) => sum + item.wordCount, 0), [outline])

    if (!activeFilePath) {
        return (
            <div className="outline__empty">
                <List size={24} />
                <p>開啟文件以檢視大綱</p>
            </div>
        )
    }

    if (outline.length === 0) {
        return (
            <div className="outline__empty">
                <AlignLeft size={24} />
                <p>未偵測到章節結構</p>
                <p className="outline__empty-hint">
                    使用「第X章」或 heading 格式來產生大綱
                </p>
            </div>
        )
    }

    return (
        <div className="outline">
            {/* Header */}
            <div className="outline__header">
                <List size={14} />
                <h3 className="outline__title">大綱</h3>
                <span className="outline__stat">
                    {outline.length} 個{isScreenplay ? '場景' : '章節'} · {totalWords.toLocaleString()} 字
                </span>
            </div>

            {/* Outline items */}
            <div className="outline__list">
                {outline.map((item, idx) => (
                    <motion.div
                        key={idx}
                        className={`outline__item outline__item--${item.type}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                    >
                        <div
                            className="outline__item-header"
                            onClick={() => setExpandedScene(expandedScene === idx ? null : idx)}
                        >
                            <div className="outline__item-icon">
                                {item.type === 'scene' ? (
                                    <Clapperboard size={12} />
                                ) : item.type === 'chapter' ? (
                                    <Hash size={12} />
                                ) : (
                                    <AlignLeft size={12} />
                                )}
                            </div>
                            <span className="outline__item-title">{item.title}</span>
                            <span className="outline__item-words">
                                {item.wordCount.toLocaleString()}
                            </span>
                            {isScreenplay && (
                                expandedScene === idx
                                    ? <ChevronDown size={11} />
                                    : <ChevronRight size={11} />
                            )}
                        </div>

                        {/* Expanded detail for screenplay scenes */}
                        <AnimatePresence>
                            {isScreenplay && expandedScene === idx && (
                                <motion.div
                                    className="outline__item-detail"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="outline__detail-row">
                                        <MessageSquare size={10} />
                                        <span>{item.dialogueCount} 段對白</span>
                                    </div>
                                    <div className="outline__detail-row">
                                        <AlignLeft size={10} />
                                        <span>{item.rowCount} 行</span>
                                    </div>
                                    {item.characters?.length > 0 && (
                                        <div className="outline__detail-chars">
                                            {item.characters.map(c => (
                                                <span key={c} className="outline__char-tag">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Word distribution bar */}
            {outline.length > 1 && totalWords > 0 && (
                <div className="outline__distribution">
                    <div className="outline__dist-header">字數分布</div>
                    <div className="outline__dist-bar">
                        {outline.map((item, idx) => {
                            const pct = (item.wordCount / totalWords) * 100
                            if (pct < 0.5) return null
                            const hue = (idx * 37) % 360
                            return (
                                <div
                                    key={idx}
                                    className="outline__dist-segment"
                                    style={{
                                        width: `${pct}%`,
                                        background: `hsl(${hue}, 45%, 55%)`,
                                    }}
                                    title={`${item.title}: ${item.wordCount} 字 (${Math.round(pct)}%)`}
                                />
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
