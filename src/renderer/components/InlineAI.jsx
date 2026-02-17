import { useState, useCallback, useRef, useEffect } from 'react'
import {
    Feather, RefreshCw, Sparkles, Globe2, FileText,
    Check, X, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { streamChat, buildMessages, buildBibleContext, getConfig, getActiveApiKey } from '../services/aiService'
import { useAppState } from '../store/useAppStore'
import '../styles/inlineai.css'

const AI_ACTIONS = [
    {
        id: 'continue', icon: Feather, label: '續寫',
        buildPrompt: (text) => `請根據以下段落，自然地續寫約100-200字。保持一致的文風和語氣。\n\n「${text}」`
    },
    {
        id: 'rewrite', icon: RefreshCw, label: '重寫',
        buildPrompt: (text) => `請改寫以下段落，保留原意但提升表達力和文學性。\n\n「${text}」`
    },
    {
        id: 'polish', icon: Sparkles, label: '潤色',
        buildPrompt: (text) => `請潤色以下段落，修飾措辭、加強意象、提升文學品質，但不改變內容和意思。\n\n「${text}」`
    },
    {
        id: 'tone', icon: Globe2, label: '語氣轉換',
        buildPrompt: (text) => `請將以下段落轉換成更正式/典雅的語氣，保留原意。\n\n「${text}」`
    },
    {
        id: 'summarize', icon: FileText, label: '摘要',
        buildPrompt: (text) => `請用2-3句話摘要以下段落的核心內容。\n\n「${text}」`
    },
]

export default function InlineAI({ editor }) {
    const { storyBible } = useAppState()
    const [visible, setVisible] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })
    const [selectedText, setSelectedText] = useState('')
    const [result, setResult] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [activeAction, setActiveAction] = useState(null)
    const controllerRef = useRef(null)
    const toolbarRef = useRef(null)

    // Track editor selection
    useEffect(() => {
        if (!editor) return

        const handleSelectionUpdate = () => {
            const { from, to } = editor.state.selection
            const text = editor.state.doc.textBetween(from, to, ' ')

            if (text.length > 3) {
                setSelectedText(text)

                // Calculate position
                const coords = editor.view.coordsAtPos(from)
                const editorEl = editor.view.dom.closest('.editor-container')
                if (editorEl) {
                    const rect = editorEl.getBoundingClientRect()
                    setPosition({
                        top: coords.top - rect.top - 44,
                        left: Math.min(
                            coords.left - rect.left,
                            rect.width - 280
                        ),
                    })
                }
                setVisible(true)
            } else {
                // Don't hide immediately if we're showing a result
                if (!streaming && !result) {
                    setVisible(false)
                }
            }
        }

        editor.on('selectionUpdate', handleSelectionUpdate)
        return () => editor.off('selectionUpdate', handleSelectionUpdate)
    }, [editor, streaming, result])

    // Click outside to close
    useEffect(() => {
        const handler = (e) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                if (!streaming) {
                    setVisible(false)
                    setResult('')
                    setActiveAction(null)
                }
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [streaming])

    const handleAction = useCallback(async (action) => {
        if (streaming || !selectedText) return

        setActiveAction(action.id)
        setStreaming(true)
        setResult('')

        const config = getConfig()
        if (!getActiveApiKey(config)) {
            setResult('⚠️ 尚未設定 API Key')
            setStreaming(false)
            return
        }

        const prompt = action.buildPrompt(selectedText)
        const context = {
            bibleContext: buildBibleContext(storyBible),
        }
        const messages = buildMessages(prompt, context)

        controllerRef.current = await streamChat(
            messages,
            (_chunk, fullText) => setResult(fullText),
            (fullText) => {
                setResult(fullText)
                setStreaming(false)
                controllerRef.current = null
            },
            (errMsg) => {
                setResult(`⚠️ ${errMsg}`)
                setStreaming(false)
                controllerRef.current = null
            },
        )
    }, [selectedText, streaming, storyBible])

    const handleAccept = useCallback(() => {
        if (!result || !editor) return
        const { from, to } = editor.state.selection

        if (activeAction === 'continue') {
            // Insert after selection
            editor.chain().focus().setTextSelection(to).insertContent('\n\n' + result).run()
        } else if (activeAction === 'summarize') {
            // Insert after, don't replace
            editor.chain().focus().setTextSelection(to).insertContent('\n\n' + result).run()
        } else {
            // Replace selection
            editor.chain().focus().deleteRange({ from, to }).insertContent(result).run()
        }

        setResult('')
        setActiveAction(null)
        setVisible(false)
    }, [result, editor, activeAction])

    const handleReject = useCallback(() => {
        if (controllerRef.current?.abort) {
            controllerRef.current.abort()
        }
        setResult('')
        setActiveAction(null)
        setStreaming(false)
    }, [])

    if (!visible) return null

    return (
        <AnimatePresence>
            <motion.div
                ref={toolbarRef}
                className="inline-ai"
                style={{ top: position.top, left: position.left }}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Action buttons */}
                {!result && !streaming && (
                    <div className="inline-ai__actions">
                        {AI_ACTIONS.map(action => (
                            <button
                                key={action.id}
                                className="inline-ai__btn"
                                onClick={() => handleAction(action)}
                                title={action.label}
                            >
                                <action.icon size={12} />
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Streaming / Result */}
                {(streaming || result) && (
                    <div className="inline-ai__result-area">
                        <div className="inline-ai__result-label">
                            {streaming ? (
                                <><Loader2 size={11} className="spin" /> 生成中…</>
                            ) : (
                                <span>AI 建議</span>
                            )}
                        </div>
                        <div className="inline-ai__result-text">
                            {result || ''}
                        </div>
                        <div className="inline-ai__result-actions">
                            <button
                                className="inline-ai__accept"
                                onClick={handleAccept}
                                disabled={streaming || !result}
                                title="接受"
                            >
                                <Check size={12} />
                                接受
                            </button>
                            <button
                                className="inline-ai__reject"
                                onClick={handleReject}
                                title="拒絕"
                            >
                                <X size={12} />
                                拒絕
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
