import { useMemo } from 'react'
import { Flame, TrendingUp, Calendar, Award, PenLine } from 'lucide-react'
import { motion } from 'framer-motion'
import { getRecentStats, getSummary, getTodayWords } from '../services/writingStatsService'
import '../styles/heatmap.css'

// ─── Color scale (ink-wash inspired) ───
const COLORS = [
    'var(--heatmap-empty, rgba(255,255,255,0.04))',  // 0 words
    'rgba(201, 86, 60, 0.20)',   // light
    'rgba(201, 86, 60, 0.38)',
    'rgba(201, 86, 60, 0.56)',
    'rgba(201, 86, 60, 0.74)',
    'rgba(201, 86, 60, 0.92)',   // intense
]

function getColorLevel(words, maxWords) {
    if (words === 0) return 0
    if (maxWords === 0) return 0
    const ratio = words / maxWords
    if (ratio < 0.15) return 1
    if (ratio < 0.35) return 2
    if (ratio < 0.55) return 3
    if (ratio < 0.80) return 4
    return 5
}

const MONTHS_TW = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const DAYS_TW = ['日', '一', '二', '三', '四', '五', '六']

const CELL_SIZE = 11
const CELL_GAP = 2
const TOTAL_CELL = CELL_SIZE + CELL_GAP

export default function WritingHeatmap() {
    const days = useMemo(() => getRecentStats(365), [])
    const summary = useMemo(() => getSummary(), [])
    const todayWords = useMemo(() => getTodayWords(), [])
    const maxWords = useMemo(() => Math.max(...days.map(d => d.words), 1), [days])

    // Organize into weeks (columns), rows = day-of-week
    const { weeks, monthLabels } = useMemo(() => {
        const wks = []
        let currentWeek = []

        // Pad the first week with empty cells before the first day
        const firstDayOfWeek = days[0]?.dayOfWeek || 0
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push(null)
        }

        days.forEach(day => {
            currentWeek.push(day)
            if (day.dayOfWeek === 6) {
                wks.push(currentWeek)
                currentWeek = []
            }
        })
        if (currentWeek.length > 0) {
            wks.push(currentWeek)
        }

        // Month labels
        const labels = []
        let lastMonth = -1
        wks.forEach((week, weekIdx) => {
            const firstDay = week.find(d => d != null)
            if (firstDay && firstDay.month !== lastMonth) {
                labels.push({ month: firstDay.month, weekIdx })
                lastMonth = firstDay.month
            }
        })

        return { weeks: wks, monthLabels: labels }
    }, [days])

    const svgWidth = weeks.length * TOTAL_CELL + 30
    const svgHeight = 7 * TOTAL_CELL + 24

    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-')
        return `${y}/${m}/${d}`
    }

    return (
        <div className="heatmap">
            {/* Stats summary row */}
            <div className="heatmap__summary">
                <motion.div
                    className="heatmap__stat heatmap__stat--streak"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Flame size={16} className="heatmap__stat-icon" />
                    <div className="heatmap__stat-body">
                        <span className="heatmap__stat-value">{summary.streak}</span>
                        <span className="heatmap__stat-label">連續天數</span>
                    </div>
                </motion.div>

                <motion.div
                    className="heatmap__stat"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <PenLine size={14} className="heatmap__stat-icon" />
                    <div className="heatmap__stat-body">
                        <span className="heatmap__stat-value">{todayWords.toLocaleString()}</span>
                        <span className="heatmap__stat-label">今日字數</span>
                    </div>
                </motion.div>

                <motion.div
                    className="heatmap__stat"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <TrendingUp size={14} className="heatmap__stat-icon" />
                    <div className="heatmap__stat-body">
                        <span className="heatmap__stat-value">{summary.avgPerDay.toLocaleString()}</span>
                        <span className="heatmap__stat-label">日均字數</span>
                    </div>
                </motion.div>

                <motion.div
                    className="heatmap__stat"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <Award size={14} className="heatmap__stat-icon" />
                    <div className="heatmap__stat-body">
                        <span className="heatmap__stat-value">{summary.bestDay.toLocaleString()}</span>
                        <span className="heatmap__stat-label">最佳紀錄</span>
                    </div>
                </motion.div>

                <motion.div
                    className="heatmap__stat"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Calendar size={14} className="heatmap__stat-icon" />
                    <div className="heatmap__stat-body">
                        <span className="heatmap__stat-value">{summary.totalDays}</span>
                        <span className="heatmap__stat-label">寫作天數</span>
                    </div>
                </motion.div>
            </div>

            {/* Total words */}
            <div className="heatmap__total">
                過去一年共寫了 <strong>{summary.totalWords.toLocaleString()}</strong> 字
            </div>

            {/* SVG Heatmap */}
            <div className="heatmap__chart-wrap">
                <svg
                    className="heatmap__chart"
                    width={svgWidth}
                    height={svgHeight}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                >
                    {/* Day-of-week labels */}
                    {[1, 3, 5].map(dow => (
                        <text
                            key={dow}
                            x={0}
                            y={24 + dow * TOTAL_CELL + CELL_SIZE / 2 + 1}
                            fill="var(--text-muted)"
                            fontSize={9}
                            textAnchor="start"
                            dominantBaseline="central"
                            fontFamily="var(--font-ui, sans-serif)"
                        >
                            {DAYS_TW[dow]}
                        </text>
                    ))}

                    {/* Month labels */}
                    {monthLabels.map((ml, i) => (
                        <text
                            key={i}
                            x={20 + ml.weekIdx * TOTAL_CELL}
                            y={14}
                            fill="var(--text-muted)"
                            fontSize={9}
                            textAnchor="start"
                            fontFamily="var(--font-ui, sans-serif)"
                        >
                            {MONTHS_TW[ml.month]}
                        </text>
                    ))}

                    {/* Cells */}
                    {weeks.map((week, wi) =>
                        week.map((day, di) => {
                            if (!day) return null
                            const level = getColorLevel(day.words, maxWords)
                            const x = 20 + wi * TOTAL_CELL
                            const y = 24 + di * TOTAL_CELL

                            return (
                                <rect
                                    key={day.date}
                                    x={x}
                                    y={y}
                                    width={CELL_SIZE}
                                    height={CELL_SIZE}
                                    rx={2}
                                    fill={COLORS[level]}
                                    className="heatmap__cell"
                                >
                                    <title>
                                        {formatDate(day.date)}：{day.words.toLocaleString()} 字
                                    </title>
                                </rect>
                            )
                        })
                    )}
                </svg>
            </div>

            {/* Legend */}
            <div className="heatmap__legend">
                <span className="heatmap__legend-label">少</span>
                {COLORS.map((color, i) => (
                    <span
                        key={i}
                        className="heatmap__legend-cell"
                        style={{ background: color }}
                    />
                ))}
                <span className="heatmap__legend-label">多</span>
            </div>
        </div>
    )
}
