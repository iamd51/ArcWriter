import { useState } from 'react'
import {
    Bold, Italic, Strikethrough, Underline as UnderlineIcon,
    Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Minus, Code,
    Undo2, Redo2,
    Scissors, Copy, ClipboardPaste,
    Type, Paintbrush,
} from 'lucide-react'
import ColorPicker from './ColorPicker'
import '../styles/toolbar.css'
import '../styles/colorpicker.css'

export default function Toolbar({ editor }) {
    const [showTextColor, setShowTextColor] = useState(false)
    const [showBgColor, setShowBgColor] = useState(false)
    const [currentTextColor, setCurrentTextColor] = useState('#c9563c')
    const [currentBgColor, setCurrentBgColor] = useState('#fde047')

    if (!editor) return null

    const charCount = editor.storage?.characterCount?.characters?.() ?? 0

    const handleTextColor = (color) => {
        if (color) {
            editor.chain().focus().setColor(color).run()
            setCurrentTextColor(color)
        } else {
            editor.chain().focus().unsetColor().run()
        }
        setShowTextColor(false)
    }

    const handleBgColor = (color) => {
        if (color) {
            editor.chain().focus().setHighlight({ color }).run()
            setCurrentBgColor(color)
        } else {
            editor.chain().focus().unsetHighlight().run()
        }
        setShowBgColor(false)
    }

    const groups = [
        [
            { icon: Scissors, action: () => document.execCommand('cut'), label: '剪下 Ctrl+X' },
            { icon: Copy, action: () => document.execCommand('copy'), label: '複製 Ctrl+C' },
            {
                icon: ClipboardPaste,
                action: async () => {
                    try {
                        const text = await navigator.clipboard.readText()
                        editor.chain().focus().insertContent(text).run()
                    } catch {
                        document.execCommand('paste')
                    }
                },
                label: '貼上 Ctrl+V',
            },
        ],
        [
            { icon: Undo2, action: () => editor.chain().focus().undo().run(), label: '復原 Ctrl+Z' },
            { icon: Redo2, action: () => editor.chain().focus().redo().run(), label: '重做 Ctrl+Y' },
        ],
        [
            { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: '粗體 Ctrl+B' },
            { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: '斜體 Ctrl+I' },
            { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), label: '刪除線' },
            { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline?.().run(), active: editor.isActive?.('underline'), label: '底線 Ctrl+U' },
            { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), label: '程式碼' },
        ],
        [
            { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), label: '標題一' },
            { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: '標題二' },
            { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: '標題三' },
        ],
        [
            { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: '項目列表' },
            { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: '編號列表' },
            { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), label: '引用' },
            { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), label: '分隔線' },
        ],
    ]

    return (
        <div className="toolbar">
            <div className="toolbar__left">
                {groups.map((group, gi) => (
                    <div key={gi} className="toolbar__group">
                        {group.map(({ icon: Icon, action, active, label }, bi) => (
                            <button
                                key={bi}
                                className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''}`}
                                onClick={action}
                                title={label}
                            >
                                <Icon size={15} strokeWidth={active ? 2.2 : 1.6} />
                            </button>
                        ))}

                        {/* Insert color buttons after text formatting group (index 2) */}
                        {gi === 2 && (
                            <>
                                {/* Text Color */}
                                <div className="toolbar__color-wrap">
                                    <button
                                        className="toolbar__color-btn"
                                        onClick={() => {
                                            setShowTextColor(!showTextColor)
                                            setShowBgColor(false)
                                        }}
                                        title="文字顏色"
                                    >
                                        <Type size={14} strokeWidth={1.6} />
                                        <span
                                            className="toolbar__color-indicator"
                                            style={{ background: currentTextColor }}
                                        />
                                    </button>
                                    {showTextColor && (
                                        <ColorPicker
                                            mode="text"
                                            currentColor={currentTextColor}
                                            onSelect={handleTextColor}
                                            onClose={() => setShowTextColor(false)}
                                        />
                                    )}
                                </div>

                                {/* Background Color */}
                                <div className="toolbar__color-wrap">
                                    <button
                                        className="toolbar__color-btn"
                                        onClick={() => {
                                            setShowBgColor(!showBgColor)
                                            setShowTextColor(false)
                                        }}
                                        title="底色"
                                    >
                                        <Paintbrush size={14} strokeWidth={1.6} />
                                        <span
                                            className="toolbar__color-indicator"
                                            style={{ background: currentBgColor }}
                                        />
                                    </button>
                                    {showBgColor && (
                                        <ColorPicker
                                            mode="background"
                                            currentColor={currentBgColor}
                                            onSelect={handleBgColor}
                                            onClose={() => setShowBgColor(false)}
                                        />
                                    )}
                                </div>
                            </>
                        )}

                        {gi < groups.length - 1 && <div className="toolbar__separator" />}
                    </div>
                ))}
            </div>
            <div className="toolbar__right">
                <span className="toolbar__word-count" title="字數">
                    {charCount.toLocaleString()} ▼
                </span>
            </div>
        </div>
    )
}
