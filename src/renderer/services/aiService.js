/**
 * AI Service — handles LLM API calls with OpenAI-compatible format.
 * Built-in providers (Gemini, OpenAI) + unlimited custom endpoints.
 * Per-provider config + saved model profiles for quick switching.
 * Stores config in localStorage.
 */

const CONFIG_KEY = 'arcwriter_ai_config'

// ═══ Built-in provider presets ═══
export const BUILTIN_PROVIDERS = {
    gemini: {
        label: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        models: [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
        ],
        defaultModel: 'gemini-2.0-flash',
        builtin: true,
    },
    openai: {
        label: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/',
        models: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-3.5-turbo',
        ],
        defaultModel: 'gpt-4o-mini',
        builtin: true,
    },
}

// ═══ Default system prompt for creative writing ═══
export const DEFAULT_SYSTEM_PROMPT = `你是一位專業的中文創作助手，擅長小說、劇本、故事創作。

你的特點：
- 文筆優美，善用修辭和意象
- 能寫出生動立體的角色對話
- 熟悉各種寫作風格（武俠、奇幻、都市、懸疑等）
- 回答簡潔有力，避免冗長解釋
- 直接提供創作內容，除非使用者要求分析或討論

使用繁體中文回應。`

export const ROLEPLAY_SYSTEM_PROMPT = `你正在進行角色扮演。你需要完全代入指定角色，用該角色的語氣、口吻、性格來回應。

規則：
- 始終保持角色身份，不要跳出角色
- 使用繁體中文
- 回應要符合角色的背景設定和表達特點
- 不要加入旁白或 OOC（Out of Character）的解釋`

// ═══ Helpers ═══
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function defaultProviderConfig(providerId) {
    const preset = BUILTIN_PROVIDERS[providerId]
    return {
        apiKey: '',
        endpoint: preset?.endpoint || '',
        model: preset?.defaultModel || '',
        customModels: [],
    }
}

function defaultConfig() {
    return {
        activeProvider: 'gemini',
        providerConfigs: {
            gemini: defaultProviderConfig('gemini'),
            openai: defaultProviderConfig('openai'),
        },
        // User-defined custom endpoints  [{ id, label, endpoint }]
        customProviders: [],
        // Saved profiles  [{ id, name, provider, model, endpoint, apiKey }]
        profiles: [],
        activeProfileId: null,
        // Shared settings
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        roleplayMode: false,
        roleplayCharacter: '',
    }
}

// ═══ Get ALL providers (builtin + custom) as a map ═══
export function getAllProviders(config) {
    const map = {}
    // Built-in
    Object.entries(BUILTIN_PROVIDERS).forEach(([id, p]) => {
        map[id] = { ...p }
    })
        // Custom endpoints
        ; (config?.customProviders || []).forEach(cp => {
            map[cp.id] = {
                label: cp.label,
                endpoint: cp.endpoint || '',
                models: [],
                defaultModel: '',
                builtin: false,
            }
        })
    return map
}

// ═══ Config management ═══
export function getConfig() {
    try {
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && !parsed.providerConfigs) {
                return migrateOldConfig(parsed)
            }
            // Ensure built-in providers exist
            Object.keys(BUILTIN_PROVIDERS).forEach(pid => {
                if (!parsed.providerConfigs[pid]) {
                    parsed.providerConfigs[pid] = defaultProviderConfig(pid)
                }
            })
            if (!parsed.customProviders) parsed.customProviders = []
            if (!parsed.profiles) parsed.profiles = []
            // Migrate old single "custom" provider
            if (parsed.providerConfigs.custom) {
                const oldCustom = parsed.providerConfigs.custom
                if (oldCustom.apiKey || oldCustom.endpoint) {
                    const cpId = genId()
                    parsed.customProviders.push({
                        id: cpId,
                        label: '自訂端點',
                        endpoint: oldCustom.endpoint || '',
                    })
                    parsed.providerConfigs[cpId] = {
                        apiKey: oldCustom.apiKey || '',
                        endpoint: oldCustom.endpoint || '',
                        model: oldCustom.model || '',
                        customModels: oldCustom.customModels || [],
                    }
                    if (parsed.activeProvider === 'custom') {
                        parsed.activeProvider = cpId
                    }
                }
                delete parsed.providerConfigs.custom
                setConfig(parsed)
            }
            return parsed
        }
    } catch { /* ignore */ }
    return defaultConfig()
}

function migrateOldConfig(old) {
    const cfg = defaultConfig()
    const provider = old.provider || 'gemini'
    cfg.temperature = old.temperature ?? 0.7
    cfg.maxTokens = old.maxTokens ?? 2048
    cfg.systemPrompt = old.systemPrompt || DEFAULT_SYSTEM_PROMPT
    cfg.roleplayMode = old.roleplayMode || false
    cfg.roleplayCharacter = old.roleplayCharacter || ''

    if (provider === 'custom') {
        const cpId = genId()
        cfg.customProviders.push({
            id: cpId,
            label: '自訂端點',
            endpoint: old.endpoint || '',
        })
        cfg.providerConfigs[cpId] = {
            apiKey: old.apiKey || '',
            endpoint: old.endpoint || '',
            model: old.model || '',
            customModels: [],
        }
        cfg.activeProvider = cpId
    } else {
        cfg.activeProvider = provider
        if (old.apiKey) cfg.providerConfigs[provider].apiKey = old.apiKey
        if (old.model) cfg.providerConfigs[provider].model = old.model
    }
    setConfig(cfg)
    return cfg
}

export function setConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

// ═══ Active provider helpers ═══
export function getActiveProviderConfig(config) {
    const pid = config?.activeProvider || 'gemini'
    return config?.providerConfigs?.[pid] || defaultProviderConfig(pid)
}

export function getActiveEndpoint(config) {
    const pc = getActiveProviderConfig(config)
    return (pc.endpoint || '').replace(/\/$/, '')
}

export function getActiveModel(config) {
    return getActiveProviderConfig(config).model || ''
}

export function getActiveApiKey(config) {
    return getActiveProviderConfig(config).apiKey || ''
}

// ═══ Custom provider CRUD ═══
export function addCustomProvider(config, label, endpoint) {
    const cpId = genId()
    const updated = {
        ...config,
        customProviders: [...(config.customProviders || []), { id: cpId, label, endpoint }],
        providerConfigs: {
            ...config.providerConfigs,
            [cpId]: {
                apiKey: '',
                endpoint,
                model: '',
                customModels: [],
            },
        },
        activeProvider: cpId,
        activeProfileId: null,
    }
    setConfig(updated)
    return updated
}

export function removeCustomProvider(config, cpId) {
    const updated = {
        ...config,
        customProviders: (config.customProviders || []).filter(cp => cp.id !== cpId),
        profiles: (config.profiles || []).filter(p => p.provider !== cpId),
    }
    delete updated.providerConfigs[cpId]
    if (updated.activeProvider === cpId) {
        updated.activeProvider = 'gemini'
        updated.activeProfileId = null
    }
    setConfig(updated)
    return updated
}

export function renameCustomProvider(config, cpId, newLabel) {
    const updated = {
        ...config,
        customProviders: (config.customProviders || []).map(cp =>
            cp.id === cpId ? { ...cp, label: newLabel } : cp
        ),
    }
    setConfig(updated)
    return updated
}

// ═══ Profile management ═══
export function createProfile(config, name) {
    const pc = getActiveProviderConfig(config)
    const profile = {
        id: genId(),
        name,
        provider: config.activeProvider,
        model: pc.model,
        endpoint: pc.endpoint,
        apiKey: pc.apiKey,
    }
    const updated = {
        ...config,
        profiles: [...(config.profiles || []), profile],
        activeProfileId: profile.id,
    }
    setConfig(updated)
    return updated
}

export function deleteProfile(config, profileId) {
    const updated = {
        ...config,
        profiles: (config.profiles || []).filter(p => p.id !== profileId),
        activeProfileId: config.activeProfileId === profileId ? null : config.activeProfileId,
    }
    setConfig(updated)
    return updated
}

export function applyProfile(config, profileId) {
    const profile = (config.profiles || []).find(p => p.id === profileId)
    if (!profile) return config

    const updated = { ...config, activeProvider: profile.provider, activeProfileId: profileId }
    updated.providerConfigs = { ...updated.providerConfigs }
    updated.providerConfigs[profile.provider] = {
        ...updated.providerConfigs[profile.provider],
        apiKey: profile.apiKey,
        model: profile.model,
        endpoint: profile.endpoint,
    }
    setConfig(updated)
    return updated
}

// ═══ Build context-aware messages ═══
export function buildMessages(userMessage, context = {}) {
    const config = getConfig()
    const messages = []

    let systemContent = config.systemPrompt || DEFAULT_SYSTEM_PROMPT

    if (config.roleplayMode && config.roleplayCharacter) {
        systemContent = ROLEPLAY_SYSTEM_PROMPT +
            `\n\n你現在扮演的角色：\n${config.roleplayCharacter}`
    }

    if (context.currentText) {
        systemContent += `\n\n---\n【目前編輯中的文件內容】\n${context.currentText.slice(0, 3000)}`
    }
    if (context.bibleContext) {
        systemContent += `\n\n---\n【故事聖經摘要】\n${context.bibleContext.slice(0, 2000)}`
    }

    messages.push({ role: 'system', content: systemContent })

    if (context.history) {
        messages.push(...context.history)
    }

    messages.push({ role: 'user', content: userMessage })
    return messages
}

// ═══ Streaming chat API ═══
export async function streamChat(messages, onChunk, onDone, onError) {
    const config = getConfig()
    const apiKey = getActiveApiKey(config)
    if (!apiKey) {
        onError?.('尚未設定 API Key，請前往設定面板。')
        return null
    }

    const endpoint = getActiveEndpoint(config)
    const model = getActiveModel(config)
    const url = `${endpoint}/chat/completions`

    const controller = new AbortController()

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                stream: true,
            }),
            signal: controller.signal,
        })

        if (!response.ok) {
            const errorText = await response.text()
            let msg = `API 錯誤 (${response.status})`
            try {
                const err = JSON.parse(errorText)
                msg = err.error?.message || msg
            } catch { /* use default */ }
            onError?.(msg)
            return null
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || !trimmed.startsWith('data: ')) continue
                const data = trimmed.slice(6)
                if (data === '[DONE]') {
                    onDone?.(fullText)
                    return controller
                }
                try {
                    const parsed = JSON.parse(data)
                    const delta = parsed.choices?.[0]?.delta?.content || ''
                    if (delta) {
                        fullText += delta
                        onChunk?.(delta, fullText)
                    }
                } catch { /* skip malformed */ }
            }
        }

        onDone?.(fullText)
    } catch (err) {
        if (err.name === 'AbortError') {
            onDone?.('')
        } else {
            onError?.(err.message || '連線失敗')
        }
    }

    return controller
}

// ═══ Test connection ═══
export async function testConnection() {
    const config = getConfig()
    const apiKey = getActiveApiKey(config)
    if (!apiKey) {
        return { ok: false, msg: '請輸入 API Key' }
    }

    const endpoint = getActiveEndpoint(config)
    const model = getActiveModel(config)
    const url = `${endpoint}/chat/completions`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10,
            }),
        })

        if (response.ok) {
            return { ok: true, msg: '✅ 連線成功' }
        }

        const text = await response.text()
        let msg = `錯誤 ${response.status}`
        try {
            const err = JSON.parse(text)
            msg = err.error?.message || msg
        } catch { /* use default */ }
        return { ok: false, msg }
    } catch (err) {
        return { ok: false, msg: err.message || '連線失敗' }
    }
}

// ═══ Build Story Bible summary for context ═══
export function buildBibleContext(storyBible) {
    if (!storyBible?.entries?.length) return ''

    const lines = []
    const categories = storyBible.categories || []

    categories.forEach(cat => {
        const entries = storyBible.entries.filter(e => e.category === cat.id)
        if (entries.length === 0) return
        lines.push(`## ${cat.label}`)
        entries.forEach(entry => {
            lines.push(`- **${entry.title}**${entry.subtitle ? ` (${entry.subtitle})` : ''}`)
            if (entry.tags?.length) lines.push(`  標籤: ${entry.tags.join(', ')}`)
            const fields = entry.fields || {}
            Object.entries(fields).forEach(([key, val]) => {
                if (val && key !== 'relationships' && typeof val === 'string' && val.trim()) {
                    lines.push(`  ${key}: ${val.slice(0, 200)}`)
                }
            })
        })
    })

    return lines.join('\n')
}
