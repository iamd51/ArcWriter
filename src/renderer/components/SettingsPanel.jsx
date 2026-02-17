import { useState, useCallback } from 'react'
import {
    Key, Globe, Cpu, Thermometer, Hash, MessageSquare,
    CheckCircle2, XCircle, Loader2, RefreshCw, Theater,
    Plus, Trash2, Save, Star, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getConfig, setConfig, testConnection, BUILTIN_PROVIDERS, DEFAULT_SYSTEM_PROMPT,
    getActiveProviderConfig, getAllProviders,
    createProfile, deleteProfile, applyProfile,
    addCustomProvider, removeCustomProvider,
} from '../services/aiService'
import '../styles/settings.css'

export default function SettingsPanel() {
    const [config, setLocalConfig] = useState(getConfig)
    const [testResult, setTestResult] = useState(null)
    const [testing, setTesting] = useState(false)
    const [newModelName, setNewModelName] = useState('')
    const [newProfileName, setNewProfileName] = useState('')
    const [showAddModel, setShowAddModel] = useState(false)
    const [showAddProfile, setShowAddProfile] = useState(false)
    const [showAddEndpoint, setShowAddEndpoint] = useState(false)
    const [newEndpointLabel, setNewEndpointLabel] = useState('')
    const [newEndpointUrl, setNewEndpointUrl] = useState('')

    const persist = useCallback((updated) => {
        setConfig(updated)
        setLocalConfig(updated)
    }, [])

    // ─── Provider switching ───
    const handleProviderChange = useCallback((provider) => {
        const updated = { ...config, activeProvider: provider, activeProfileId: null }
        persist(updated)
        setTestResult(null)
    }, [config, persist])

    // ─── Per-provider config update ───
    const updateProviderField = useCallback((field, value) => {
        const pid = config.activeProvider
        const updated = {
            ...config,
            providerConfigs: {
                ...config.providerConfigs,
                [pid]: {
                    ...config.providerConfigs[pid],
                    [field]: value,
                },
            },
        }
        // Also update endpoint in customProviders list
        if (field === 'endpoint') {
            updated.customProviders = (updated.customProviders || []).map(cp =>
                cp.id === pid ? { ...cp, endpoint: value } : cp
            )
        }
        persist(updated)
    }, [config, persist])

    // ─── Shared config update ───
    const updateShared = useCallback((changes) => {
        persist({ ...config, ...changes })
    }, [config, persist])

    // ─── Add custom endpoint ───
    const handleAddEndpoint = useCallback(() => {
        const label = newEndpointLabel.trim()
        if (!label) return
        const url = newEndpointUrl.trim()
        const updated = addCustomProvider(config, label, url)
        setLocalConfig(updated)
        setNewEndpointLabel('')
        setNewEndpointUrl('')
        setShowAddEndpoint(false)
        setTestResult(null)
    }, [config, newEndpointLabel, newEndpointUrl])

    // ─── Remove custom endpoint ───
    const handleRemoveEndpoint = useCallback((cpId) => {
        const updated = removeCustomProvider(config, cpId)
        setLocalConfig(updated)
        setTestResult(null)
    }, [config])

    // ─── Custom model management ───
    const handleAddModel = useCallback(() => {
        const name = newModelName.trim()
        if (!name) return
        const pid = config.activeProvider
        const pc = config.providerConfigs[pid]
        const customs = pc.customModels || []
        if (customs.includes(name)) return
        const updated = {
            ...config,
            providerConfigs: {
                ...config.providerConfigs,
                [pid]: {
                    ...pc,
                    customModels: [...customs, name],
                    model: name,
                },
            },
        }
        persist(updated)
        setNewModelName('')
        setShowAddModel(false)
    }, [config, newModelName, persist])

    const handleDeleteModel = useCallback((modelName) => {
        const pid = config.activeProvider
        const pc = config.providerConfigs[pid]
        const customs = (pc.customModels || []).filter(m => m !== modelName)
        const allProviders = getAllProviders(config)
        const presetModels = allProviders[pid]?.models || []
        const updated = {
            ...config,
            providerConfigs: {
                ...config.providerConfigs,
                [pid]: {
                    ...pc,
                    customModels: customs,
                    model: pc.model === modelName ? (presetModels[0] || customs[0] || '') : pc.model,
                },
            },
        }
        persist(updated)
    }, [config, persist])

    // ─── Profile management ───
    const handleSaveProfile = useCallback(() => {
        const name = newProfileName.trim()
        if (!name) return
        const updated = createProfile(config, name)
        setLocalConfig(updated)
        setNewProfileName('')
        setShowAddProfile(false)
    }, [config, newProfileName])

    const handleDeleteProfile = useCallback((profileId) => {
        const updated = deleteProfile(config, profileId)
        setLocalConfig(updated)
    }, [config])

    const handleApplyProfile = useCallback((profileId) => {
        const updated = applyProfile(config, profileId)
        setLocalConfig(updated)
        setTestResult(null)
    }, [config])

    // ─── Test ───
    const handleTest = useCallback(async () => {
        setTesting(true)
        setTestResult(null)
        const result = await testConnection()
        setTestResult(result)
        setTesting(false)
    }, [])

    // ─── Derived ───
    const pid = config.activeProvider
    const pc = getActiveProviderConfig(config)
    const allProviders = getAllProviders(config)
    const providerInfo = allProviders[pid] || { label: '?', models: [], builtin: false }
    const presetModels = providerInfo.models || []
    const customModels = pc.customModels || []
    const allModels = [...presetModels, ...customModels]
    const profiles = config.profiles || []
    const customProviders = config.customProviders || []
    const isCustom = !providerInfo.builtin

    return (
        <div className="settings-panel">
            <div className="settings-panel__header">
                <h3 className="settings-panel__title">AI 設定</h3>
            </div>

            <div className="settings-panel__scroll">
                {/* ═══ Saved Profiles ═══ */}
                {profiles.length > 0 && (
                    <div className="settings-panel__group">
                        <label className="settings-panel__label">
                            <Star size={12} />
                            快速切換
                        </label>
                        <div className="settings-panel__profiles">
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    className={`settings-panel__profile ${config.activeProfileId === p.id ? 'settings-panel__profile--active' : ''}`}
                                >
                                    <button
                                        className="settings-panel__profile-name"
                                        onClick={() => handleApplyProfile(p.id)}
                                        title={`${allProviders[p.provider]?.label || p.provider} / ${p.model}`}
                                    >
                                        <span className="settings-panel__profile-dot" />
                                        {p.name}
                                    </button>
                                    <button
                                        className="settings-panel__profile-del"
                                        onClick={() => handleDeleteProfile(p.id)}
                                        title="刪除"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ Providers ═══ */}
                <div className="settings-panel__group">
                    <label className="settings-panel__label">
                        <Globe size={12} />
                        API 提供者
                    </label>
                    {/* Built-in */}
                    <div className="settings-panel__provider-grid">
                        {Object.entries(BUILTIN_PROVIDERS).map(([key, p]) => (
                            <button
                                key={key}
                                className={`settings-panel__provider-btn ${pid === key ? 'settings-panel__provider-btn--active' : ''}`}
                                onClick={() => handleProviderChange(key)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {/* Custom endpoints */}
                    {customProviders.length > 0 && (
                        <div className="settings-panel__custom-providers">
                            {customProviders.map(cp => (
                                <div
                                    key={cp.id}
                                    className={`settings-panel__custom-provider ${pid === cp.id ? 'settings-panel__custom-provider--active' : ''}`}
                                >
                                    <button
                                        className="settings-panel__custom-provider-name"
                                        onClick={() => handleProviderChange(cp.id)}
                                    >
                                        <Globe size={11} />
                                        {cp.label}
                                    </button>
                                    <button
                                        className="settings-panel__custom-provider-del"
                                        onClick={() => handleRemoveEndpoint(cp.id)}
                                        title="移除此端點"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Add new endpoint */}
                    {!showAddEndpoint ? (
                        <button
                            className="settings-panel__add-endpoint-btn"
                            onClick={() => setShowAddEndpoint(true)}
                        >
                            <Plus size={11} /> 新增自訂端點
                        </button>
                    ) : (
                        <motion.div
                            className="settings-panel__add-endpoint"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            transition={{ duration: 0.15 }}
                        >
                            <input
                                className="settings-panel__input"
                                value={newEndpointLabel}
                                onChange={(e) => setNewEndpointLabel(e.target.value)}
                                placeholder="名稱（如：DeepSeek、Claude…）"
                                autoFocus
                            />
                            <input
                                className="settings-panel__input"
                                value={newEndpointUrl}
                                onChange={(e) => setNewEndpointUrl(e.target.value)}
                                placeholder="端點 URL（如：https://api.deepseek.com/v1）"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEndpoint()}
                            />
                            <div className="settings-panel__add-row">
                                <button className="settings-panel__add-btn" onClick={handleAddEndpoint}>
                                    <Plus size={12} /> 新增
                                </button>
                                <button
                                    className="settings-panel__cancel-btn"
                                    onClick={() => { setShowAddEndpoint(false); setNewEndpointLabel(''); setNewEndpointUrl('') }}
                                >
                                    取消
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ═══ API Key (per provider) ═══ */}
                <div className="settings-panel__group">
                    <label className="settings-panel__label">
                        <Key size={12} />
                        API Key
                    </label>
                    <input
                        type="password"
                        className="settings-panel__input"
                        value={pc.apiKey}
                        onChange={(e) => updateProviderField('apiKey', e.target.value)}
                        placeholder={`輸入 ${providerInfo.label} 的 API Key…`}
                    />
                </div>

                {/* ═══ Endpoint (editable for custom) ═══ */}
                {isCustom && (
                    <div className="settings-panel__group">
                        <label className="settings-panel__label">
                            <Globe size={12} />
                            端點 URL
                        </label>
                        <input
                            className="settings-panel__input"
                            value={pc.endpoint}
                            onChange={(e) => updateProviderField('endpoint', e.target.value)}
                            placeholder="https://api.example.com/v1/"
                        />
                    </div>
                )}

                {/* ═══ Model ═══ */}
                <div className="settings-panel__group">
                    <label className="settings-panel__label">
                        <Cpu size={12} />
                        模型
                        <button
                            className="settings-panel__add-inline"
                            onClick={() => setShowAddModel(!showAddModel)}
                            title="新增自訂模型"
                        >
                            <Plus size={11} />
                        </button>
                    </label>

                    {allModels.length > 0 ? (
                        <div className="settings-panel__model-list">
                            {allModels.map(m => {
                                const isUserAdded = customModels.includes(m)
                                return (
                                    <div
                                        key={m}
                                        className={`settings-panel__model-item ${pc.model === m ? 'settings-panel__model-item--active' : ''}`}
                                    >
                                        <button
                                            className="settings-panel__model-btn"
                                            onClick={() => updateProviderField('model', m)}
                                        >
                                            <span className="settings-panel__model-dot" />
                                            <span className="settings-panel__model-name">{m}</span>
                                            {isUserAdded && <span className="settings-panel__model-tag">自訂</span>}
                                        </button>
                                        {isUserAdded && (
                                            <button
                                                className="settings-panel__model-del"
                                                onClick={() => handleDeleteModel(m)}
                                                title="移除"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <input
                            className="settings-panel__input"
                            value={pc.model}
                            onChange={(e) => updateProviderField('model', e.target.value)}
                            placeholder="輸入模型名稱…"
                        />
                    )}

                    <AnimatePresence>
                        {showAddModel && (
                            <motion.div
                                className="settings-panel__add-row"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <input
                                    className="settings-panel__input"
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    placeholder="輸入模型名稱…"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                                    autoFocus
                                />
                                <button className="settings-panel__add-btn" onClick={handleAddModel}>
                                    <Plus size={12} /> 新增
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══ Save as Profile ═══ */}
                <div className="settings-panel__group">
                    {!showAddProfile ? (
                        <button
                            className="settings-panel__save-profile-btn"
                            onClick={() => setShowAddProfile(true)}
                        >
                            <Save size={12} /> 儲存為快速設定
                        </button>
                    ) : (
                        <motion.div
                            className="settings-panel__add-row"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <input
                                className="settings-panel__input"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                placeholder="設定名稱（如：DeepSeek 寫小說）"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveProfile()
                                    if (e.key === 'Escape') setShowAddProfile(false)
                                }}
                                autoFocus
                            />
                            <button className="settings-panel__add-btn" onClick={handleSaveProfile}>
                                <Save size={12} /> 儲存
                            </button>
                        </motion.div>
                    )}
                </div>

                <div className="settings-panel__divider" />

                {/* ═══ Temperature ═══ */}
                <div className="settings-panel__group">
                    <label className="settings-panel__label">
                        <Thermometer size={12} />
                        溫度
                        <span className="settings-panel__value">{config.temperature}</span>
                    </label>
                    <input
                        type="range"
                        className="settings-panel__slider"
                        min="0" max="2" step="0.1"
                        value={config.temperature}
                        onChange={(e) => updateShared({ temperature: parseFloat(e.target.value) })}
                    />
                    <div className="settings-panel__range-labels">
                        <span>精確</span><span>創意</span>
                    </div>
                </div>

                {/* ═══ Max Tokens ═══ */}
                <div className="settings-panel__group">
                    <label className="settings-panel__label">
                        <Hash size={12} />
                        最大 Tokens
                        <span className="settings-panel__value">{config.maxTokens}</span>
                    </label>
                    <input
                        type="range"
                        className="settings-panel__slider"
                        min="256" max="8192" step="256"
                        value={config.maxTokens}
                        onChange={(e) => updateShared({ maxTokens: parseInt(e.target.value) })}
                    />
                    <div className="settings-panel__range-labels">
                        <span>256</span><span>8192</span>
                    </div>
                </div>

                {/* ═══ System Prompt ═══ */}
                <div className="settings-panel__group">
                    <label className="settings-panel__label">
                        <MessageSquare size={12} />
                        系統 Prompt
                    </label>
                    <textarea
                        className="settings-panel__textarea"
                        value={config.systemPrompt}
                        onChange={(e) => updateShared({ systemPrompt: e.target.value })}
                        placeholder="輸入系統提示詞…"
                        rows={5}
                    />
                    <button
                        className="settings-panel__reset-btn"
                        onClick={() => updateShared({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                    >
                        <RefreshCw size={11} /> 重設為預設
                    </button>
                </div>

                {/* ═══ Roleplay ═══ */}
                <div className="settings-panel__group">
                    <div className="settings-panel__toggle-row">
                        <label className="settings-panel__label" style={{ marginBottom: 0 }}>
                            <Theater size={12} />
                            角色扮演模式
                        </label>
                        <button
                            className={`settings-panel__toggle ${config.roleplayMode ? 'settings-panel__toggle--on' : ''}`}
                            onClick={() => updateShared({ roleplayMode: !config.roleplayMode })}
                        >
                            <span className="settings-panel__toggle-dot" />
                        </button>
                    </div>
                    <p className="settings-panel__hint">
                        開啟後，AI 會代入指定角色進行對話
                    </p>
                    {config.roleplayMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <textarea
                                className="settings-panel__textarea settings-panel__textarea--sm"
                                value={config.roleplayCharacter || ''}
                                onChange={(e) => updateShared({ roleplayCharacter: e.target.value })}
                                placeholder="描述角色設定…（如：你是來自墨硯城的騎士哈汀，性格沉穩寡言…）"
                                rows={3}
                            />
                        </motion.div>
                    )}
                </div>

                {/* ═══ Test ═══ */}
                <div className="settings-panel__group settings-panel__test">
                    <button
                        className="settings-panel__test-btn"
                        onClick={handleTest}
                        disabled={testing || !pc.apiKey}
                    >
                        {testing ? (
                            <><Loader2 size={13} className="spin" /> 測試中…</>
                        ) : (
                            <>測試連線</>
                        )}
                    </button>

                    {testResult && (
                        <motion.div
                            className={`settings-panel__test-result ${testResult.ok ? 'settings-panel__test-result--ok' : 'settings-panel__test-result--err'}`}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {testResult.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            <span>{testResult.msg}</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
