import {
    Bold, Italic, Strikethrough, Underline as UnderlineIcon,
    Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter,
    Scissors, Copy, ClipboardPaste,
    Plus, Trash2,
    ChevronDown, ChevronRight,
} from 'lucide-react'
import '../styles/toolbar.css'

export default function ScreenplayToolbar({
    onAddRow,
    onAddScene,
    onDeleteRow,
    onToggleCollapseAll,
    allCollapsed,
    selectedCell,
    onApplyStyle,
}) {
    const textStyles = [
        {
            icon: Bold,
            action: () => onApplyStyle('bold'),
            label: '粗體',
            shortcut: 'Ctrl+B',
        },
        {
            icon: Italic,
            action: () => onApplyStyle('italic'),
            label: '斜體',
            shortcut: 'Ctrl+I',
        },
        {
            icon: Strikethrough,
            action: () => onApplyStyle('strikethrough'),
            label: '刪除線',
        },
        {
            icon: UnderlineIcon,
            action: () => onApplyStyle('underline'),
            label: '底線',
            shortcut: 'Ctrl+U',
        },
    ]

    const headingStyles = [
        {
            icon: Heading1,
            action: () => onApplyStyle('h1'),
            label: '標題一',
        },
        {
            icon: Heading2,
            action: () => onApplyStyle('h2'),
            label: '標題二',
        },
        {
            icon: Heading3,
            action: () => onApplyStyle('h3'),
            label: '標題三',
        },
    ]

    const clipboardActions = [
        {
            icon: Scissors,
            action: () => document.execCommand('cut'),
            label: '剪下 Ctrl+X',
        },
        {
            icon: Copy,
            action: () => document.execCommand('copy'),
            label: '複製 Ctrl+C',
        },
        {
            icon: ClipboardPaste,
            action: async () => {
                try {
                    const text = await navigator.clipboard.readText()
                    document.execCommand('insertText', false, text)
                } catch {
                    document.execCommand('paste')
                }
            },
            label: '貼上 Ctrl+V',
        },
    ]

    const structureActions = [
        {
            icon: Plus,
            action: onAddScene,
            label: '新增場景',
        },
        {
            icon: Plus,
            action: onAddRow,
            label: '新增行',
            secondary: true,
        },
        {
            icon: Trash2,
            action: onDeleteRow,
            label: '刪除選取行',
            destructive: true,
        },
        {
            icon: allCollapsed ? ChevronRight : ChevronDown,
            action: onToggleCollapseAll,
            label: allCollapsed ? '展開全部場景' : '摺疊全部場景',
        },
    ]

    const groups = [clipboardActions, textStyles, headingStyles, structureActions]

    return (
        <div className="toolbar">
            {groups.map((group, gi) => (
                <div key={gi} className="toolbar__group">
                    {group.map(({ icon: Icon, action, active, label, destructive, secondary }, bi) => (
                        <button
                            key={bi}
                            className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''} ${destructive ? 'toolbar__btn--destructive' : ''} ${secondary ? 'toolbar__btn--secondary' : ''}`}
                            onClick={action}
                            title={label}
                        >
                            <Icon size={15} strokeWidth={active ? 2.2 : 1.6} />
                        </button>
                    ))}
                    {gi < groups.length - 1 && <div className="toolbar__separator" />}
                </div>
            ))}
        </div>
    )
}
