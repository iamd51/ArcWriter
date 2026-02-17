/**
 * Story Bible service — manages .arcbible data.
 * Handles categories, entries, field templates, and CRUD operations.
 */

import { v4 as uuidv4 } from 'uuid'

// ═══ Lucide icon names for categories ═══
export const CATEGORY_ICONS = [
    'user', 'users', 'map-pin', 'map', 'shield', 'sword',
    'gem', 'crown', 'calendar', 'clock', 'globe', 'book-open',
    'scroll', 'flag', 'heart', 'star', 'zap', 'eye',
    'feather', 'compass', 'mountain', 'tree-pine', 'castle', 'skull',
]

// ═══ Palette for category colors ═══
export const CATEGORY_COLORS = [
    '#c9563c', // cinnabar
    '#b8965a', // gold
    '#7fae8b', // celadon
    '#8b7ec9', // purple
    '#c9963c', // amber
    '#5a9eb8', // teal
    '#c95a8b', // rose
    '#6b8bc9', // slate blue
    '#8bc96b', // lime
    '#c9c95a', // olive
]

// ═══ Default categories ═══
export const DEFAULT_CATEGORIES = [
    { id: 'characters', label: '角色', icon: 'user', color: '#c9563c' },
    { id: 'locations', label: '場景地點', icon: 'map-pin', color: '#b8965a' },
    { id: 'factions', label: '勢力陣營', icon: 'shield', color: '#7fae8b' },
    { id: 'items', label: '物品道具', icon: 'gem', color: '#8b7ec9' },
    { id: 'events', label: '事件時間線', icon: 'calendar', color: '#c9963c' },
    { id: 'lore', label: '世界觀', icon: 'globe', color: '#5a9eb8' },
]

// ═══ Field templates per built-in category ═══
export const FIELD_TEMPLATES = {
    characters: [
        { key: 'fullName', label: '全名', type: 'short' },
        { key: 'age', label: '年齡', type: 'short' },
        { key: 'appearance', label: '外貌', type: 'long' },
        { key: 'personality', label: '性格', type: 'long' },
        { key: 'background', label: '背景故事', type: 'long' },
        { key: 'goals', label: '目標動機', type: 'long' },
        { key: 'abilities', label: '能力特長', type: 'long' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
    locations: [
        { key: 'description', label: '描述', type: 'long' },
        { key: 'climate', label: '氣候環境', type: 'short' },
        { key: 'population', label: '人口規模', type: 'short' },
        { key: 'faction', label: '所屬勢力', type: 'short' },
        { key: 'history', label: '歷史', type: 'long' },
        { key: 'features', label: '地標特色', type: 'long' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
    factions: [
        { key: 'description', label: '描述', type: 'long' },
        { key: 'leader', label: '領導者', type: 'short' },
        { key: 'territory', label: '勢力範圍', type: 'short' },
        { key: 'ideology', label: '理念信條', type: 'long' },
        { key: 'members', label: '重要成員', type: 'long' },
        { key: 'conflicts', label: '衝突關係', type: 'long' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
    items: [
        { key: 'description', label: '描述', type: 'long' },
        { key: 'origin', label: '來歷', type: 'long' },
        { key: 'powers', label: '能力效果', type: 'long' },
        { key: 'owner', label: '擁有者', type: 'short' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
    events: [
        { key: 'description', label: '描述', type: 'long' },
        { key: 'date', label: '日期時間', type: 'short' },
        { key: 'location', label: '發生地點', type: 'short' },
        { key: 'participants', label: '參與者', type: 'long' },
        { key: 'outcome', label: '結果影響', type: 'long' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
    lore: [
        { key: 'description', label: '描述', type: 'long' },
        { key: 'details', label: '詳細內容', type: 'long' },
        { key: 'rules', label: '規則法則', type: 'long' },
        { key: 'exceptions', label: '例外情況', type: 'long' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
    // Fallback for custom categories
    _default: [
        { key: 'description', label: '描述', type: 'long' },
        { key: 'details', label: '詳細內容', type: 'long' },
        { key: 'notes', label: '備註', type: 'long' },
    ],
}

/**
 * Create a fresh empty bible
 */
export function createEmptyBible() {
    return {
        version: 1,
        categories: [...DEFAULT_CATEGORIES],
        entries: [],
    }
}

/**
 * Get field template for a category
 */
export function getFieldTemplate(categoryId) {
    return FIELD_TEMPLATES[categoryId] || FIELD_TEMPLATES._default
}

/**
 * Create a new entry with template fields pre-filled
 */
export function createEntry(categoryId, title = '') {
    const template = getFieldTemplate(categoryId)
    const fields = {}
    template.forEach(f => { fields[f.key] = '' })
    fields.relationships = []

    return {
        id: uuidv4(),
        category: categoryId,
        title: title || '新條目',
        subtitle: '',
        avatar: null,
        tags: [],
        fields,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
}

/**
 * Create a new custom category
 */
export function createCategory(label, icon = 'star', color = '#8b7ec9') {
    return {
        id: `custom_${Date.now()}`,
        label,
        icon,
        color,
    }
}
