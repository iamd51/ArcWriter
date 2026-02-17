import { useState, useCallback, useRef, useEffect } from 'react'
import {
    Send, Trash2, Copy, ClipboardPaste, Loader2,
    Sparkles, BookOpen, Feather, Lightbulb, RefreshCw, Square,
    Theater, ChevronDown, Cpu,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import {
    streamChat, buildMessages, buildBibleContext, getConfig, setConfig,
    getActiveProviderConfig, getActiveModel, PROVIDERS,
    applyProfile,
} from '../services/aiService'
import '../styles/aipanel.css'

const QUICK_PROMPTS = [
    { icon: Feather, label: '續寫下一段', prompt: '請根據目前的劇情和文風，續寫下一段內容。' },
    { icon: Sparkles, label: '發展角色', prompt: '請幫我深入發展目前作品中的角色，讓角色更加立體。' },
    { icon: Lightbulb, label: '給我靈感', prompt: '請根據目前的故事設定，給我幾個有趣的劇情走向或靈感。' },
    { icon: RefreshCw, label: '改寫潤色', prompt: '請改寫並潤色以下段落，提升文學性和表達力。以下是段落內容：\n\n' },
]

export default function AIPanel() {
    const { activeFilePath, openFiles, storyBible } = useAppState()
    const { updateContent } = useAppActions()

    const [messages, setMessages] = useState([]) // { role, content }
    const [input, setInput] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [streamText, setStreamText] = useState('')
    const controllerRef = useRef(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const composingRef = useRef(false)
    const [showModelSwitcher, setShowModelSwitcher] = useState(false)

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamText])

    // Get current editor context
    const getEditorContext = useCallback(() => {
        const activeFile = openFiles.find(f => f.path === activeFilePath)
        let text = ''
        if (activeFile?.content) {
            // Strip HTML tags for novel content
            text = typeof activeFile.content === 'string'
                ? activeFile.content.replace(/<[^>]*>/g, '').slice(0, 3000)
                : JSON.stringify(activeFile.content).slice(0, 3000)
        }
        return text
    }, [activeFilePath, openFiles])

    const handleSend = useCallback(async (promptOverride) => {
        const text = promptOverride || input.trim()
        if (!text || streaming) return

        const userMsg = { role: 'user', content: text }
        const newHistory = [...messages, userMsg]
        setMessages(newHistory)
        setInput('')
        setStreaming(true)
        setStreamText('')

        const context = {
            currentText: getEditorContext(),
            bibleContext: buildBibleContext(storyBible),
            history: messages,
        }

        const apiMessages = buildMessages(text, context)

        controllerRef.current = await streamChat(
            apiMessages,
            // onChunk
            (_chunk, fullText) => {
                setStreamText(fullText)
            },
            // onDone
            (fullText) => {
                if (fullText) {
                    setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
                }
                setStreamText('')
                setStreaming(false)
                controllerRef.current = null
            },
            // onError
            (errMsg) => {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ ${errMsg}`,
                    isError: true,
                }])
                setStreamText('')
                setStreaming(false)
                controllerRef.current = null
            },
        )
    }, [input, messages, streaming, getEditorContext, storyBible])

    const handleStop = useCallback(() => {
        if (controllerRef.current?.abort) {
            controllerRef.current.abort()
        }
        if (streamText) {
            setMessages(prev => [...prev, { role: 'assistant', content: streamText }])
        }
        setStreamText('')
        setStreaming(false)
    }, [streamText])

    const handleClear = useCallback(() => {
        setMessages([])
        setStreamText('')
    }, [])

    const handleCopy = useCallback((content) => {
        navigator.clipboard.writeText(content)
    }, [])

    const handleInsert = useCallback((content) => {
        if (!activeFilePath) return
        const activeFile = openFiles.find(f => f.path === activeFilePath)
        if (activeFile) {
            const newContent = activeFile.content + '\n\n' + content
            updateContent(activeFilePath, newContent)
        }
    }, [activeFilePath, openFiles, updateContent])

    const handleKeyDown = useCallback((e) => {
        if (composingRef.current) return
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    const config = getConfig()
    const isRoleplay = config.roleplayMode
    const currentModel = getActiveModel(config)
    const pid = config.activeProvider
    const pc = getActiveProviderConfig(config)
    const providerPreset = PROVIDERS[pid] || PROVIDERS.custom
    const allModels = [...(providerPreset.models || []), ...(pc.customModels || [])]
    const profiles = config.profiles || []

    const handleModelSwitch = useCallback((model) => {
        const cfg = getConfig()
        const p = cfg.activeProvider
        cfg.providerConfigs[p] = { ...cfg.providerConfigs[p], model }
        cfg.activeProfileId = null
        setConfig(cfg)
        setShowModelSwitcher(false)
    }, [])

    const handleProfileSwitch = useCallback((profileId) => {
        applyProfile(getConfig(), profileId)
        setShowModelSwitcher(false)
    }, [])

    return (
        <div className="ai-panel">
            {/* Header */}
            <div className="ai-panel__header">
                <div className="ai-panel__header-left">
                    <Sparkles size={14} className="ai-panel__icon" />
                    <span className="ai-panel__title">AI 助手</span>
                    {isRoleplay && (
                        <span className="ai-panel__roleplay-badge">
                            <Theater size={10} />
                            扮演中
                        </span>
                    )}
                </div>
                <button
                    className="ai-panel__clear-btn"
                    onClick={handleClear}
                    title="清除對話"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Model switcher bar */}
            <div className="ai-panel__model-bar">
                <button
                    className="ai-panel__model-trigger"
                    onClick={() => setShowModelSwitcher(!showModelSwitcher)}
                >
                    <Cpu size={11} />
                    <span className="ai-panel__model-name">{currentModel || '未選擇模型'}</span>
                    <ChevronDown size={11} className={`ai-panel__model-chevron ${showModelSwitcher ? 'ai-panel__model-chevron--open' : ''}`} />
                </button>
            </div>

            <AnimatePresence>
                {showModelSwitcher && (
                    <motion.div
                        className="ai-panel__model-dropdown"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* Profiles */}
                        {profiles.length > 0 && (
                            <div className="ai-panel__model-section">
                                <div className="ai-panel__model-section-label">快速設定</div>
                                {profiles.map(p => (
                                    <button
                                        key={p.id}
                                        className={`ai-panel__model-option ${config.activeProfileId === p.id ? 'ai-panel__model-option--active' : ''}`}
                                        onClick={() => handleProfileSwitch(p.id)}
                                    >
                                        <span className="ai-panel__model-option-dot" />
                                        {p.name}
                                        <span className="ai-panel__model-option-sub">{p.model}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Available models */}
                        <div className="ai-panel__model-section">
                            <div className="ai-panel__model-section-label">{providerPreset.label}</div>
                            {allModels.map(m => (
                                <button
                                    key={m}
                                    className={`ai-panel__model-option ${currentModel === m && !config.activeProfileId ? 'ai-panel__model-option--active' : ''}`}
                                    onClick={() => handleModelSwitch(m)}
                                >
                                    <span className="ai-panel__model-option-dot" />
                                    {m}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="ai-panel__messages">
                {messages.length === 0 && !streaming && (
                    <div className="ai-panel__empty">
                        <Sparkles size={20} className="ai-panel__empty-icon" />
                        <p>你好！我是 AI 寫作助手。</p>
                        <p>我會自動讀取你的文件和故事聖經作為上下文。</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`ai-panel__msg ai-panel__msg--${msg.role} ${msg.isError ? 'ai-panel__msg--error' : ''}`}
                    >
                        <div className="ai-panel__msg-content">
                            {msg.content}
                        </div>
                        {msg.role === 'assistant' && !msg.isError && (
                            <div className="ai-panel__msg-actions">
                                <button
                                    className="ai-panel__msg-action"
                                    onClick={() => handleCopy(msg.content)}
                                    title="複製"
                                >
                                    <Copy size={11} />
                                </button>
                                <button
                                    className="ai-panel__msg-action"
                                    onClick={() => handleInsert(msg.content)}
                                    title="插入到編輯器"
                                >
                                    <ClipboardPaste size={11} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Streaming indicator */}
                {streaming && (
                    <div className="ai-panel__msg ai-panel__msg--assistant ai-panel__msg--streaming">
                        <div className="ai-panel__msg-content">
                            {streamText || (
                                <span className="ai-panel__typing">
                                    <span /><span /><span />
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            {messages.length === 0 && !streaming && (
                <div className="ai-panel__quick">
                    {QUICK_PROMPTS.map((qp, idx) => (
                        <button
                            key={idx}
                            className="ai-panel__quick-btn"
                            onClick={() => handleSend(qp.prompt)}
                        >
                            <qp.icon size={12} />
                            <span>{qp.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="ai-panel__input-area">
                <textarea
                    ref={inputRef}
                    className="ai-panel__input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => { composingRef.current = true }}
                    onCompositionEnd={() => { composingRef.current = false }}
                    placeholder="輸入訊息… (Enter 傳送, Shift+Enter 換行)"
                    rows={2}
                    disabled={streaming}
                />
                <div className="ai-panel__input-actions">
                    {streaming ? (
                        <button
                            className="ai-panel__send-btn ai-panel__send-btn--stop"
                            onClick={handleStop}
                            title="停止生成"
                        >
                            <Square size={12} />
                        </button>
                    ) : (
                        <button
                            className="ai-panel__send-btn"
                            onClick={() => handleSend()}
                            disabled={!input.trim()}
                            title="傳送"
                        >
                            <Send size={13} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
