import { useState, useEffect, useCallback, Component } from 'react'
import { AppProvider, useAppState, useAppActions } from './store/useAppStore'
import useAutoSave from './hooks/useAutoSave'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import Editor from './components/Editor'
import EntryEditor from './components/EntryEditor'
import StatusBar from './components/StatusBar'
import WelcomeScreen from './components/WelcomeScreen'
import CreateFileDialog from './components/CreateFileDialog'
import CommandPalette from './components/CommandPalette'
import FocusMode from './components/FocusMode'
import ExportDialog from './components/ExportDialog'

const RECENT_PROJECTS_KEY = 'arcwriter_recent_projects'

// ── ErrorBoundary to catch render crashes ──
class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })
        console.error('React ErrorBoundary caught:', error, errorInfo)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 40, color: '#c9563c',
                    background: '#1a1816', minHeight: '100vh',
                    fontFamily: 'monospace', fontSize: 13,
                }}>
                    <h2 style={{ marginBottom: 16 }}>⚠️ ArcWriter 發生錯誤</h2>
                    <pre style={{
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        background: '#0e0d0b', padding: 16, borderRadius: 8,
                        border: '1px solid #333', color: '#e8c8a0',
                    }}>
                        {this.state.error?.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }) }}
                        style={{
                            marginTop: 16, padding: '8px 20px',
                            background: '#c9563c', color: '#fff',
                            border: 'none', borderRadius: 6, cursor: 'pointer',
                        }}
                    >
                        重試
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

function AppLayout() {
    const { openFiles, activeFilePath, project, selectedEntryId } = useAppState()
    const {
        openFolder, openFile, closeFile, setActiveFile,
        createFile, toggleSidebar, saveFile, saveFileAs, setActivePanel,
        loadBible,
    } = useAppActions()

    // Auto-save: 2 second debounce after modification
    useAutoSave(activeFilePath, openFiles, saveFile)

    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [createMode, setCreateMode] = useState('novel')
    const [showCommandPalette, setShowCommandPalette] = useState(false)
    const [focusMode, setFocusMode] = useState(false)
    const [showExport, setShowExport] = useState(false)
    const hasOpenFile = openFiles.length > 0 && activeFilePath

    // Track recent projects in localStorage
    useEffect(() => {
        if (project?.path) {
            try {
                const stored = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]')
                const filtered = stored.filter(p => p.path !== project.path)
                const updated = [{ path: project.path, name: project.name, time: Date.now() }, ...filtered].slice(0, 5)
                localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated))
            } catch { /* ignore */ }
            // Auto-load Story Bible
            loadBible(project.path)
        }
    }, [project?.path, project?.name, loadBible])

    const handleCreateFile = useCallback(async (dirPath, fileName, initialContent) => {
        return await createFile(dirPath, fileName, initialContent)
    }, [createFile])

    // Tab navigation helpers
    const handleNextTab = useCallback(() => {
        if (openFiles.length < 2) return
        const idx = openFiles.findIndex(f => f.path === activeFilePath)
        const next = openFiles[(idx + 1) % openFiles.length]
        setActiveFile(next.path)
    }, [openFiles, activeFilePath, setActiveFile])

    const handlePrevTab = useCallback(() => {
        if (openFiles.length < 2) return
        const idx = openFiles.findIndex(f => f.path === activeFilePath)
        const prev = openFiles[(idx - 1 + openFiles.length) % openFiles.length]
        setActiveFile(prev.path)
    }, [openFiles, activeFilePath, setActiveFile])

    // Centralized keyboard shortcuts
    useKeyboardShortcuts({
        onNewFile: () => {
            if (project) {
                setCreateMode('novel')
                setShowCreateDialog(true)
            }
        },
        onSave: () => {
            if (activeFilePath) saveFile(activeFilePath)
        },
        onSaveAs: () => {
            if (activeFilePath) saveFileAs(activeFilePath)
        },
        onCloseTab: () => {
            if (activeFilePath) closeFile(activeFilePath)
        },
        onNextTab: handleNextTab,
        onPrevTab: handlePrevTab,
        onCrossFileSearch: () => {
            setActivePanel('search')
        },
        onCommandPalette: () => {
            setShowCommandPalette(true)
        },
        onToggleSidebar: () => {
            toggleSidebar()
        },
        onFocusMode: () => {
            if (activeFilePath) setFocusMode(true)
        },
        onExport: () => {
            if (activeFilePath) setShowExport(true)
        },
    })

    // Handle menu bar actions
    const handleMenuAction = useCallback((action) => {
        switch (action) {
            case 'openFolder':
                openFolder()
                break
            case 'newNovel':
                if (project) {
                    setCreateMode('novel')
                    setShowCreateDialog(true)
                }
                break
            case 'newScreenplay':
                if (project) {
                    setCreateMode('screenplay')
                    setShowCreateDialog(true)
                }
                break
            case 'save':
                if (activeFilePath) saveFile(activeFilePath)
                break
            case 'saveAs':
                if (activeFilePath) saveFileAs(activeFilePath)
                break
            case 'export':
                if (activeFilePath) setShowExport(true)
                break
            case 'undo':
                document.execCommand('undo')
                break
            case 'redo':
                document.execCommand('redo')
                break
            case 'cut':
                document.execCommand('cut')
                break
            case 'copy':
                document.execCommand('copy')
                break
            case 'paste':
                navigator.clipboard.readText().then(text => {
                    document.execCommand('insertText', false, text)
                }).catch(() => document.execCommand('paste'))
                break
            case 'find':
                window.dispatchEvent(new CustomEvent('arcwriter:toggle-search'))
                break
            case 'replace':
                window.dispatchEvent(new CustomEvent('arcwriter:toggle-search', { detail: { replace: true } }))
                break
            case 'findInProject':
                setActivePanel('search')
                break
            case 'toggleSidebar':
                toggleSidebar()
                break
            case 'zoomIn':
                document.body.style.setProperty('zoom',
                    `${(parseFloat(document.body.style.zoom || '1') + 0.1)}`)
                break
            case 'zoomOut':
                document.body.style.setProperty('zoom',
                    `${Math.max(0.5, parseFloat(document.body.style.zoom || '1') - 0.1)}`)
                break
            case 'zoomReset':
                document.body.style.setProperty('zoom', '1')
                break
            case 'commandPalette':
                setShowCommandPalette(true)
                break
        }
    }, [openFolder, project, toggleSidebar, activeFilePath, saveFile, saveFileAs, setActivePanel])

    // Drag and drop file opening
    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
    }, [])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        const files = Array.from(e.dataTransfer.files)
        files.forEach(file => {
            if (file.path) {
                openFile(file.path, file.name)
            }
        })
    }, [openFile])

    return (
        <div className="app" onDragOver={handleDragOver} onDrop={handleDrop}>
            <TitleBar onMenuAction={handleMenuAction} />
            <div className="app__body">
                <ActivityBar />
                <Sidebar />
                <div className="app__main">
                    {selectedEntryId ? (
                        <EntryEditor />
                    ) : hasOpenFile ? (
                        <>
                            <TabBar />
                            <Editor />
                        </>
                    ) : (
                        <WelcomeScreen />
                    )}
                </div>
            </div>
            <StatusBar onFocusMode={() => setFocusMode(true)} />

            {/* Create File Dialog */}
            <CreateFileDialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreateFile={handleCreateFile}
                currentDir={project?.path || ''}
                initialMode={createMode}
            />

            {/* Command Palette */}
            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
            />

            {/* Focus Mode */}
            <FocusMode
                isOpen={focusMode}
                onClose={() => setFocusMode(false)}
            />

            {/* Export Dialog */}
            <ExportDialog
                isOpen={showExport}
                onClose={() => setShowExport(false)}
            />
        </div>
    )
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppProvider>
                <AppLayout />
            </AppProvider>
        </ErrorBoundary>
    )
}
