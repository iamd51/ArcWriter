import { useState, useRef, useEffect } from 'react'
import '../styles/colorpicker.css'

// ─── Curated color palette (ink-wash inspired + standard colors) ───

const THEME_COLORS = [
    // Row 1: neutrals
    ['#000000', '#1a1816', '#2d2a26', '#404040', '#595959', '#808080', '#a6a6a6', '#bfbfbf', '#d9d9d9', '#ffffff'],
    // Row 2: dark warm tones
    ['#7f1d1d', '#78350f', '#713f12', '#365314', '#134e4a', '#1e3a5f', '#312e81', '#581c87', '#831843', '#6b2141'],
    // Row 3: mid tones
    ['#c9563c', '#b8965a', '#a16207', '#4d7c0f', '#0d9488', '#0284c7', '#4f46e5', '#7c3aed', '#be185d', '#9f1239'],
    // Row 4: vibrant
    ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'],
    // Row 5: pastels
    ['#fca5a5', '#fcd34d', '#fde047', '#bef264', '#5eead4', '#93c5fd', '#a5b4fc', '#c4b5fd', '#f9a8d4', '#fda4af'],
]

const STANDARD_COLORS = [
    '#c9563c', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#1abc9c', '#3498db', '#9b59b6', '#34495e', '#7f8c8d',
]

export default function ColorPicker({ onSelect, onClose, mode = 'text', currentColor }) {
    const ref = useRef(null)

    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    return (
        <div className="color-picker" ref={ref}>
            <div className="color-picker__header">
                {mode === 'text' ? '文字顏色' : '底色'}
            </div>

            {/* Theme colors grid */}
            <div className="color-picker__section">
                <span className="color-picker__label">主題色彩</span>
                <div className="color-picker__grid">
                    {THEME_COLORS.map((row, ri) => (
                        <div key={ri} className="color-picker__row">
                            {row.map(color => (
                                <button
                                    key={color}
                                    className={`color-picker__swatch ${currentColor === color ? 'color-picker__swatch--active' : ''}`}
                                    style={{ background: color }}
                                    onClick={() => onSelect(color)}
                                    title={color}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Standard colors */}
            <div className="color-picker__section">
                <span className="color-picker__label">標準色彩</span>
                <div className="color-picker__row">
                    {STANDARD_COLORS.map(color => (
                        <button
                            key={color}
                            className={`color-picker__swatch ${currentColor === color ? 'color-picker__swatch--active' : ''}`}
                            style={{ background: color }}
                            onClick={() => onSelect(color)}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            {/* Clear / No color */}
            <button
                className="color-picker__clear"
                onClick={() => onSelect(null)}
            >
                {mode === 'text' ? '無填滿(N)' : '無底色(N)'}
            </button>

            {/* Custom color input */}
            <div className="color-picker__custom">
                <label className="color-picker__custom-label">
                    🎨 其他色彩(M)…
                    <input
                        type="color"
                        className="color-picker__custom-input"
                        defaultValue={currentColor || '#c9563c'}
                        onChange={e => onSelect(e.target.value)}
                    />
                </label>
            </div>
        </div>
    )
}
