import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { createEmptyBible, createEntry as createBibleEntryTemplate } from '../services/storyBibleService'

const AppContext = createContext(null)
const DispatchContext = createContext(null)

const initialState = {
    // Project
    project: null, // { path, name, tree }

    // Sidebar
    sidebarVisible: true,
    activePanel: 'files', // 'files' | 'search' | 'bible' | 'ai' | 'settings'

    // Tabs & Editor
    openFiles: [], // [{ path, name, content, modified }]
    activeFilePath: null,

    // Story Bible
    storyBible: null,           // { version, categories, entries }
    selectedEntryId: null,      // currently viewed entry in EntryEditor
    bibleLoaded: false,

    // UI
    theme: localStorage.getItem('arcwriter_theme') || 'dark',
}

function appReducer(state, action) {
    switch (action.type) {
        case 'SET_PROJECT':
            return {
                ...state,
                project: action.payload,
                openFiles: [],
                activeFilePath: null,
            }

        case 'TOGGLE_SIDEBAR':
            return { ...state, sidebarVisible: !state.sidebarVisible }

        case 'SET_ACTIVE_PANEL':
            return {
                ...state,
                activePanel: action.payload,
                sidebarVisible: state.activePanel === action.payload && state.sidebarVisible
                    ? false
                    : true,
            }

        case 'OPEN_FILE': {
            const { path, name, content } = action.payload
            const exists = state.openFiles.find(f => f.path === path)
            if (exists) {
                return { ...state, activeFilePath: path }
            }
            return {
                ...state,
                openFiles: [...state.openFiles, { path, name, content, modified: false }],
                activeFilePath: path,
            }
        }

        case 'CLOSE_FILE': {
            const filtered = state.openFiles.filter(f => f.path !== action.payload)
            let newActive = state.activeFilePath
            if (state.activeFilePath === action.payload) {
                const idx = state.openFiles.findIndex(f => f.path === action.payload)
                newActive = filtered[Math.min(idx, filtered.length - 1)]?.path || null
            }
            return { ...state, openFiles: filtered, activeFilePath: newActive }
        }

        case 'SET_ACTIVE_FILE':
            return { ...state, activeFilePath: action.payload }

        case 'UPDATE_FILE_CONTENT': {
            const { path, content } = action.payload
            return {
                ...state,
                openFiles: state.openFiles.map(f =>
                    f.path === path ? { ...f, content, modified: true } : f
                ),
            }
        }

        case 'MARK_FILE_SAVED': {
            return {
                ...state,
                openFiles: state.openFiles.map(f =>
                    f.path === action.payload ? { ...f, modified: false } : f
                ),
            }
        }

        case 'REFRESH_TREE':
            return {
                ...state,
                project: state.project
                    ? { ...state.project, tree: action.payload }
                    : null,
            }

        // ═══ Story Bible ═══
        case 'SET_BIBLE':
            return { ...state, storyBible: action.payload, bibleLoaded: true }

        case 'UPDATE_BIBLE':
            return { ...state, storyBible: action.payload }

        case 'SELECT_BIBLE_ENTRY':
            return { ...state, selectedEntryId: action.payload }

        case 'CLEAR_BIBLE':
            return { ...state, storyBible: null, selectedEntryId: null, bibleLoaded: false }

        case 'SET_THEME':
            return { ...state, theme: action.payload }

        default:
            return state
    }
}

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState)

    // Apply initial theme on mount
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', state.theme)
    }, []) // eslint-disable-line

    return (
        <AppContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>
                {children}
            </DispatchContext.Provider>
        </AppContext.Provider>
    )
}

export function useAppState() {
    const ctx = useContext(AppContext)
    if (!ctx && ctx !== initialState) throw new Error('useAppState must be used within AppProvider')
    return ctx
}

export function useAppDispatch() {
    const ctx = useContext(DispatchContext)
    if (!ctx) throw new Error('useAppDispatch must be used within AppProvider')
    return ctx
}

export function useAppActions() {
    const dispatch = useAppDispatch()
    const state = useContext(AppContext)

    const openFolder = useCallback(async () => {
        const result = await window.electronAPI.openFolder()
        if (result) {
            dispatch({ type: 'SET_PROJECT', payload: result })
        }
    }, [dispatch])

    // Extensions that ArcWriter can open as text
    const TEXT_EXTENSIONS = new Set([
        'md', 'markdown', 'txt', 'text',
        'arc',
        'json', 'yaml', 'yml', 'toml',
        'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'htm', 'xml', 'svg',
        'py', 'rb', 'java', 'c', 'cpp', 'h', 'sh', 'bat', 'ps1',
        'csv', 'log', 'ini', 'cfg', 'conf', 'env',
        'gitignore', 'editorconfig', 'prettierrc',
    ])

    const openFile = useCallback(async (filePath, fileName) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        if (!TEXT_EXTENSIONS.has(ext)) {
            // Binary file — skip silently (or could show a toast in the future)
            return
        }
        const content = await window.electronAPI.readFile(filePath)
        if (content !== null) {
            dispatch({ type: 'OPEN_FILE', payload: { path: filePath, name: fileName, content } })
        }
    }, [dispatch])

    const closeFile = useCallback((filePath) => {
        dispatch({ type: 'CLOSE_FILE', payload: filePath })
    }, [dispatch])

    const setActiveFile = useCallback((filePath) => {
        dispatch({ type: 'SET_ACTIVE_FILE', payload: filePath })
    }, [dispatch])

    const updateContent = useCallback((filePath, content) => {
        dispatch({ type: 'UPDATE_FILE_CONTENT', payload: { path: filePath, content } })
    }, [dispatch])

    const saveFile = useCallback(async (filePath) => {
        const file = state.openFiles.find(f => f.path === filePath)
        if (file) {
            const ok = await window.electronAPI.writeFile(filePath, file.content)
            if (ok) dispatch({ type: 'MARK_FILE_SAVED', payload: filePath })
        }
    }, [dispatch, state.openFiles])

    const createFile = useCallback(async (dirPath, fileName, initialContent) => {
        const result = await window.electronAPI.createFile(dirPath, fileName, initialContent)
        if (result.path) {
            // Read the content back and open the file
            const content = initialContent || ''
            dispatch({ type: 'OPEN_FILE', payload: { path: result.path, name: fileName, content } })
            // Refresh tree if project is open
            if (state.project) {
                const tree = await window.electronAPI.readDirectory(state.project.path)
                dispatch({ type: 'REFRESH_TREE', payload: tree })
            }
        }
        return result
    }, [dispatch, state.project])

    const saveFileAs = useCallback(async (filePath) => {
        const file = state.openFiles.find(f => f.path === filePath)
        if (!file) return
        const defaultName = file.name || 'untitled.md'
        const result = await window.electronAPI.saveFileAs(file.content, defaultName)
        if (result?.path) {
            // Open the newly saved file
            dispatch({ type: 'OPEN_FILE', payload: { path: result.path, name: result.name, content: file.content } })
            dispatch({ type: 'MARK_FILE_SAVED', payload: result.path })
            // Refresh tree if in same project
            if (state.project) {
                const tree = await window.electronAPI.readDirectory(state.project.path)
                dispatch({ type: 'REFRESH_TREE', payload: tree })
            }
        }
    }, [dispatch, state.openFiles, state.project])

    const setActivePanel = useCallback((panel) => {
        dispatch({ type: 'SET_ACTIVE_PANEL', payload: panel })
    }, [dispatch])

    const toggleSidebar = useCallback(() => {
        dispatch({ type: 'TOGGLE_SIDEBAR' })
    }, [dispatch])

    const refreshTree = useCallback(async (projectPath) => {
        const tree = await window.electronAPI.readDirectory(projectPath)
        dispatch({ type: 'REFRESH_TREE', payload: tree })
    }, [dispatch])

    // ═══ Story Bible actions ═══
    const loadBible = useCallback(async (projectPath) => {
        const data = await window.electronAPI.readBible(projectPath)
        dispatch({ type: 'SET_BIBLE', payload: data || createEmptyBible() })
    }, [dispatch])

    const saveBible = useCallback(async (bibleData) => {
        if (!state.project?.path) return
        dispatch({ type: 'UPDATE_BIBLE', payload: bibleData })
        await window.electronAPI.writeBible(state.project.path, bibleData)
    }, [dispatch, state.project?.path])

    const createBibleEntry = useCallback(async (categoryId, title) => {
        const bible = state.storyBible
        if (!bible || !state.project?.path) return null
        const entry = createBibleEntryTemplate(categoryId, title)
        const updated = { ...bible, entries: [...bible.entries, entry] }
        dispatch({ type: 'UPDATE_BIBLE', payload: updated })
        await window.electronAPI.writeBible(state.project.path, updated)
        return entry
    }, [dispatch, state.storyBible, state.project?.path])

    const updateBibleEntry = useCallback(async (entryId, changes) => {
        const bible = state.storyBible
        if (!bible || !state.project?.path) return
        const updated = {
            ...bible,
            entries: bible.entries.map(e =>
                e.id === entryId ? { ...e, ...changes, updatedAt: Date.now() } : e
            ),
        }
        dispatch({ type: 'UPDATE_BIBLE', payload: updated })
        await window.electronAPI.writeBible(state.project.path, updated)
    }, [dispatch, state.storyBible, state.project?.path])

    const deleteBibleEntry = useCallback(async (entryId) => {
        const bible = state.storyBible
        if (!bible || !state.project?.path) return
        const updated = {
            ...bible,
            entries: bible.entries.filter(e => e.id !== entryId),
        }
        dispatch({ type: 'UPDATE_BIBLE', payload: updated })
        dispatch({ type: 'SELECT_BIBLE_ENTRY', payload: null })
        await window.electronAPI.writeBible(state.project.path, updated)
    }, [dispatch, state.storyBible, state.project?.path])

    const selectBibleEntry = useCallback((entryId) => {
        dispatch({ type: 'SELECT_BIBLE_ENTRY', payload: entryId })
    }, [dispatch])

    const updateBibleCategories = useCallback(async (categories) => {
        const bible = state.storyBible
        if (!bible || !state.project?.path) return
        const updated = { ...bible, categories }
        dispatch({ type: 'UPDATE_BIBLE', payload: updated })
        await window.electronAPI.writeBible(state.project.path, updated)
    }, [dispatch, state.storyBible, state.project?.path])

    const toggleTheme = useCallback(() => {
        const next = state.theme === 'dark' ? 'light' : 'dark'
        dispatch({ type: 'SET_THEME', payload: next })
        localStorage.setItem('arcwriter_theme', next)
        document.documentElement.setAttribute('data-theme', next)
    }, [dispatch, state.theme])

    return {
        openFolder, openFile, closeFile, setActiveFile,
        updateContent, saveFile, saveFileAs, createFile,
        setActivePanel, toggleSidebar, refreshTree, toggleTheme,
        // Bible
        loadBible, saveBible, createBibleEntry, updateBibleEntry,
        deleteBibleEntry, selectBibleEntry, updateBibleCategories,
    }
}
