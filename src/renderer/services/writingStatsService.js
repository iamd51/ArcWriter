/**
 * Writing Stats Service
 * Tracks daily word counts in localStorage and provides aggregation helpers.
 *
 * Storage format:
 *   arcwriter_writing_stats = { "2026-02-18": 1234, "2026-02-17": 567, ... }
 */

const STORAGE_KEY = 'arcwriter_writing_stats'

function getToday() {
    const d = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function loadStats() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch {
        return {}
    }
}

function saveStats(stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

/**
 * Record words written today. Called with the TOTAL words in the current session.
 * We store the highest value seen per day (not cumulative across sessions).
 */
export function recordWords(totalSessionWords) {
    const stats = loadStats()
    const today = getToday()
    const current = stats[today] || 0
    // Only update if the new value is higher (handles page refreshes)
    if (totalSessionWords > current) {
        stats[today] = totalSessionWords
        saveStats(stats)
    }
}

/**
 * Add an increment of words to today's count.
 * Good for tracking deltas rather than absolute values.
 */
export function addWords(count) {
    if (count <= 0) return
    const stats = loadStats()
    const today = getToday()
    stats[today] = (stats[today] || 0) + count
    saveStats(stats)
}

/**
 * Get the word count for a specific date string (YYYY-MM-DD).
 */
export function getWordsForDate(dateStr) {
    const stats = loadStats()
    return stats[dateStr] || 0
}

/**
 * Get all stats as { date: wordCount } object.
 */
export function getAllStats() {
    return loadStats()
}

/**
 * Get stats for the last N days as an array of { date, words }.
 */
export function getRecentStats(days = 365) {
    const stats = loadStats()
    const result = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const pad = n => String(n).padStart(2, '0')
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        result.push({
            date: key,
            words: stats[key] || 0,
            dayOfWeek: d.getDay(),      // 0=Sun, 6=Sat
            month: d.getMonth(),
            year: d.getFullYear(),
        })
    }

    return result
}

/**
 * Calculate the current writing streak (consecutive days with words > 0).
 */
export function getStreak() {
    const stats = loadStats()
    let streak = 0
    const now = new Date()

    // Start from today
    for (let i = 0; i <= 365; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const pad = n => String(n).padStart(2, '0')
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

        if (stats[key] && stats[key] > 0) {
            streak++
        } else {
            // Allow today to have 0 (hasn't written yet today)
            if (i === 0) continue
            break
        }
    }

    return streak
}

/**
 * Get summary statistics.
 */
export function getSummary() {
    const stats = loadStats()
    const entries = Object.entries(stats).filter(([, v]) => v > 0)

    if (entries.length === 0) {
        return { totalWords: 0, totalDays: 0, avgPerDay: 0, bestDay: 0, bestDate: null, streak: 0 }
    }

    const totalWords = entries.reduce((sum, [, v]) => sum + v, 0)
    const totalDays = entries.length
    const avgPerDay = Math.round(totalWords / totalDays)
    let bestDay = 0
    let bestDate = null
    entries.forEach(([date, words]) => {
        if (words > bestDay) {
            bestDay = words
            bestDate = date
        }
    })

    return {
        totalWords,
        totalDays,
        avgPerDay,
        bestDay,
        bestDate,
        streak: getStreak(),
    }
}

/**
 * Get today's word count.
 */
export function getTodayWords() {
    return getWordsForDate(getToday())
}
