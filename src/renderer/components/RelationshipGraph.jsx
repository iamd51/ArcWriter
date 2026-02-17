import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
    GitFork, Plus, X, Trash2, Save, Users,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import '../styles/relationship.css'

// ─── Simple force simulation ───
function forceLayout(nodes, edges, width, height, iterations = 80) {
    const positions = nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / nodes.length
        const r = Math.min(width, height) * 0.32
        return {
            id: n.id,
            x: width / 2 + r * Math.cos(angle),
            y: height / 2 + r * Math.sin(angle),
            vx: 0, vy: 0,
        }
    })

    const posMap = Object.fromEntries(positions.map(p => [p.id, p]))
    const k = Math.sqrt((width * height) / Math.max(nodes.length, 1))

    for (let iter = 0; iter < iterations; iter++) {
        const temp = 1 - iter / iterations

        // Repulsion between all pairs
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                let dx = positions[i].x - positions[j].x
                let dy = positions[i].y - positions[j].y
                const dist = Math.sqrt(dx * dx + dy * dy) || 1
                const force = (k * k) / dist * temp * 0.5
                const fx = (dx / dist) * force
                const fy = (dy / dist) * force
                positions[i].vx += fx
                positions[i].vy += fy
                positions[j].vx -= fx
                positions[j].vy -= fy
            }
        }

        // Attraction along edges
        edges.forEach(e => {
            const a = posMap[e.source]
            const b = posMap[e.target]
            if (!a || !b) return
            let dx = b.x - a.x
            let dy = b.y - a.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = (dist * dist) / k * temp * 0.01
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx += fx
            a.vy += fy
            b.vx -= fx
            b.vy -= fy
        })

        // Center gravity
        positions.forEach(p => {
            p.vx += (width / 2 - p.x) * 0.005 * temp
            p.vy += (height / 2 - p.y) * 0.005 * temp
        })

        // Apply velocities
        positions.forEach(p => {
            const maxV = 10 * temp + 0.5
            const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
            if (v > maxV) { p.vx = (p.vx / v) * maxV; p.vy = (p.vy / v) * maxV }
            p.x += p.vx
            p.y += p.vy
            p.x = Math.max(50, Math.min(width - 50, p.x))
            p.y = Math.max(40, Math.min(height - 40, p.y))
            p.vx *= 0.7
            p.vy *= 0.7
        })
    }

    return positions
}

// ─── Relationship colors ───
const REL_COLORS = {
    '盟友': '#7fae8b',
    '敵人': '#c9563c',
    '家人': '#b8965a',
    '戀人': '#c95a8b',
    '師徒': '#8b7ec9',
    '朋友': '#5a9eb8',
    '上下級': '#c9963c',
}
const DEFAULT_REL_COLOR = '#888'

const REL_TYPES = ['盟友', '敵人', '家人', '戀人', '師徒', '朋友', '上下級', '其他']

export default function RelationshipGraph() {
    const { storyBible, project } = useAppState()
    const { saveBible, selectBibleEntry, setActivePanel } = useAppActions()
    const svgRef = useRef(null)
    const containerRef = useRef(null)

    const [size, setSize] = useState({ w: 400, h: 350 })
    const [showAddEdge, setShowAddEdge] = useState(false)
    const [edgeSource, setEdgeSource] = useState('')
    const [edgeTarget, setEdgeTarget] = useState('')
    const [edgeType, setEdgeType] = useState('朋友')
    const [edgeLabel, setEdgeLabel] = useState('')
    const [dragging, setDragging] = useState(null)
    const [hoveredNode, setHoveredNode] = useState(null)

    // Characters from story bible
    const characters = useMemo(() => {
        if (!storyBible?.entries) return []
        return storyBible.entries.filter(e => e.category === 'characters')
    }, [storyBible?.entries])

    // Relationships from entry fields
    const relationships = useMemo(() => {
        const rels = []
        characters.forEach(ch => {
            const fieldRels = ch.fields?.relationships || []
            fieldRels.forEach(rel => {
                // Avoid duplicates (A→B and B→A)
                const existing = rels.find(r =>
                    (r.source === rel.targetId && r.target === ch.id)
                )
                if (!existing) {
                    rels.push({
                        source: ch.id,
                        target: rel.targetId,
                        type: rel.type || '其他',
                        label: rel.label || '',
                    })
                }
            })
        })
        return rels
    }, [characters])

    // Measure container
    useEffect(() => {
        if (!containerRef.current) return
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            setSize({ w: Math.max(300, width), h: Math.max(250, height) })
        })
        obs.observe(containerRef.current)
        return () => obs.disconnect()
    }, [])

    // Layout
    const layout = useMemo(() => {
        if (characters.length === 0) return []
        return forceLayout(characters, relationships, size.w, size.h)
    }, [characters, relationships, size.w, size.h])

    const posMap = useMemo(() =>
        Object.fromEntries(layout.map(p => [p.id, p])),
        [layout]
    )

    // Add relationship
    const handleAddRelationship = useCallback(() => {
        if (!edgeSource || !edgeTarget || edgeSource === edgeTarget) return
        if (!storyBible) return

        const updatedEntries = storyBible.entries.map(entry => {
            if (entry.id === edgeSource) {
                const rels = [...(entry.fields?.relationships || [])]
                rels.push({ targetId: edgeTarget, type: edgeType, label: edgeLabel })
                return { ...entry, fields: { ...entry.fields, relationships: rels } }
            }
            if (entry.id === edgeTarget) {
                const rels = [...(entry.fields?.relationships || [])]
                rels.push({ targetId: edgeSource, type: edgeType, label: edgeLabel })
                return { ...entry, fields: { ...entry.fields, relationships: rels } }
            }
            return entry
        })

        saveBible({ ...storyBible, entries: updatedEntries })
        setShowAddEdge(false)
        setEdgeSource('')
        setEdgeTarget('')
        setEdgeType('朋友')
        setEdgeLabel('')
    }, [edgeSource, edgeTarget, edgeType, edgeLabel, storyBible, saveBible])

    // Delete relationship
    const handleDeleteRelationship = useCallback((sourceId, targetId) => {
        if (!storyBible) return

        const updatedEntries = storyBible.entries.map(entry => {
            if (entry.id === sourceId || entry.id === targetId) {
                const otherId = entry.id === sourceId ? targetId : sourceId
                const rels = (entry.fields?.relationships || []).filter(r => r.targetId !== otherId)
                return { ...entry, fields: { ...entry.fields, relationships: rels } }
            }
            return entry
        })

        saveBible({ ...storyBible, entries: updatedEntries })
    }, [storyBible, saveBible])

    // Click character node
    const handleNodeClick = useCallback((charId) => {
        selectBibleEntry(charId)
        setActivePanel('bible')
    }, [selectBibleEntry, setActivePanel])

    if (!project) {
        return (
            <div className="relgraph__empty">
                <GitFork size={24} />
                <p>開啟專案以檢視角色關係圖</p>
            </div>
        )
    }

    if (characters.length === 0) {
        return (
            <div className="relgraph__empty">
                <Users size={24} />
                <p>尚無角色</p>
                <p className="relgraph__empty-hint">
                    在故事聖經中新增角色後，在此建立關係
                </p>
            </div>
        )
    }

    return (
        <div className="relgraph">
            {/* Header */}
            <div className="relgraph__header">
                <GitFork size={14} />
                <h3 className="relgraph__title">角色關係</h3>
                <button
                    className="relgraph__add-btn"
                    onClick={() => setShowAddEdge(!showAddEdge)}
                    title="新增關係"
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* Add Edge form */}
            <AnimatePresence>
                {showAddEdge && (
                    <motion.div
                        className="relgraph__add-form"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <select
                            className="relgraph__select"
                            value={edgeSource}
                            onChange={e => setEdgeSource(e.target.value)}
                        >
                            <option value="">選擇角色 A</option>
                            {characters.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                        <select
                            className="relgraph__select"
                            value={edgeTarget}
                            onChange={e => setEdgeTarget(e.target.value)}
                        >
                            <option value="">選擇角色 B</option>
                            {characters.filter(c => c.id !== edgeSource).map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                        <select
                            className="relgraph__select"
                            value={edgeType}
                            onChange={e => setEdgeType(e.target.value)}
                        >
                            {REL_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <input
                            className="relgraph__input"
                            placeholder="關係描述（可選）"
                            value={edgeLabel}
                            onChange={e => setEdgeLabel(e.target.value)}
                        />
                        <button
                            className="relgraph__confirm-btn"
                            onClick={handleAddRelationship}
                            disabled={!edgeSource || !edgeTarget || edgeSource === edgeTarget}
                        >
                            <Plus size={12} />
                            建立
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SVG Graph */}
            <div className="relgraph__canvas" ref={containerRef}>
                <svg
                    ref={svgRef}
                    width={size.w}
                    height={size.h}
                    viewBox={`0 0 ${size.w} ${size.h}`}
                >
                    {/* Edges */}
                    {relationships.map((rel, idx) => {
                        const a = posMap[rel.source]
                        const b = posMap[rel.target]
                        if (!a || !b) return null
                        const color = REL_COLORS[rel.type] || DEFAULT_REL_COLOR
                        const mx = (a.x + b.x) / 2
                        const my = (a.y + b.y) / 2

                        return (
                            <g key={`edge-${idx}`} className="relgraph__edge-group">
                                <line
                                    x1={a.x} y1={a.y}
                                    x2={b.x} y2={b.y}
                                    stroke={color}
                                    strokeWidth={2}
                                    strokeOpacity={0.5}
                                />
                                {/* Label on edge */}
                                <text
                                    x={mx} y={my - 6}
                                    fill={color}
                                    fontSize={9}
                                    textAnchor="middle"
                                    className="relgraph__edge-label"
                                >
                                    {rel.type}
                                    {rel.label ? ` · ${rel.label}` : ''}
                                </text>
                                {/* Delete hitbox */}
                                <circle
                                    cx={mx} cy={my}
                                    r={8}
                                    fill="transparent"
                                    className="relgraph__edge-delete-zone"
                                    onClick={() => handleDeleteRelationship(rel.source, rel.target)}
                                />
                            </g>
                        )
                    })}

                    {/* Nodes */}
                    {characters.map((ch) => {
                        const pos = posMap[ch.id]
                        if (!pos) return null
                        const isHovered = hoveredNode === ch.id
                        const r = isHovered ? 24 : 20

                        return (
                            <g
                                key={ch.id}
                                className="relgraph__node-group"
                                onMouseEnter={() => setHoveredNode(ch.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                onClick={() => handleNodeClick(ch.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Glow */}
                                {isHovered && (
                                    <circle
                                        cx={pos.x} cy={pos.y} r={r + 4}
                                        fill="none"
                                        stroke="var(--accent)"
                                        strokeWidth={2}
                                        strokeOpacity={0.3}
                                    />
                                )}
                                {/* Circle */}
                                <circle
                                    cx={pos.x} cy={pos.y} r={r}
                                    fill="var(--bg-secondary)"
                                    stroke="var(--accent)"
                                    strokeWidth={isHovered ? 2.5 : 1.5}
                                />
                                {/* Initial */}
                                <text
                                    x={pos.x} y={pos.y + 1}
                                    fill="var(--text-primary)"
                                    fontSize={isHovered ? 13 : 12}
                                    fontWeight="700"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                >
                                    {ch.title?.charAt(0) || '?'}
                                </text>
                                {/* Name below */}
                                <text
                                    x={pos.x} y={pos.y + r + 14}
                                    fill="var(--text-secondary)"
                                    fontSize={10}
                                    textAnchor="middle"
                                    fontWeight="500"
                                >
                                    {ch.title || '?'}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="relgraph__legend">
                {Object.entries(REL_COLORS).map(([type, color]) => (
                    <span key={type} className="relgraph__legend-item">
                        <span className="relgraph__legend-dot" style={{ background: color }} />
                        {type}
                    </span>
                ))}
            </div>
        </div>
    )
}
