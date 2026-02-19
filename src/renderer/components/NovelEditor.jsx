import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { motion } from 'framer-motion'
import { useAppState, useAppDispatch } from '../store/useAppStore'
import Toolbar from './Toolbar'
import SearchBar from './SearchBar'
import InlineAI from './InlineAI'
import '../styles/editor.css'

export default function NovelEditor({ filePath: overrideFilePath }) {
    const { activeFilePath, openFiles } = useAppState()
    const dispatch = useAppDispatch()
    const filePath = overrideFilePath || activeFilePath
    const [showSearch, setShowSearch] = useState(false)
    const [showReplace, setShowReplace] = useState(false)

    const activeFile = openFiles.find(f => f.path === filePath)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({
                placeholder: '開始書寫你的故事…',
            }),
            Underline,
            CharacterCount,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
        ],
        content: '',
        onUpdate: ({ editor }) => {
            if (filePath) {
                dispatch({
                    type: 'UPDATE_FILE_CONTENT',
                    payload: { path: filePath, content: editor.getHTML() },
                })
            }
        },
        editorProps: {
            attributes: {
                spellcheck: 'false',
            },
        },
    })

    // Sync editor content when active file changes
    useEffect(() => {
        if (editor && activeFile) {
            const currentHTML = editor.getHTML()
            if (activeFile.content !== currentHTML) {
                editor.commands.setContent(activeFile.content || '')
            }
        }
    }, [filePath]) // eslint-disable-line

    // Keyboard shortcut: Ctrl+S save
    const handleSave = useCallback(async () => {
        if (filePath && activeFile) {
            const content = editor?.getHTML() || ''
            const ok = await window.electronAPI.writeFile(filePath, content)
            if (ok) {
                dispatch({ type: 'MARK_FILE_SAVED', payload: filePath })
            }
        }
    }, [filePath, activeFile, editor, dispatch])

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
            // Ctrl+F: open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
                e.preventDefault()
                setShowReplace(false)
                setShowSearch(true)
            }
            // Ctrl+H: open replace
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault()
                setShowReplace(true)
                setShowSearch(true)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleSave])

    // Listen for menu-triggered search/replace
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.replace) {
                setShowReplace(true)
            } else {
                setShowReplace(false)
            }
            setShowSearch(true)
        }
        window.addEventListener('arcwriter:toggle-search', handler)
        return () => window.removeEventListener('arcwriter:toggle-search', handler)
    }, [])

    if (!activeFile) return null

    return (
        <motion.div
            className="editor-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'relative' }}
        >
            <Toolbar editor={editor} />
            <SearchBar
                editor={editor}
                visible={showSearch}
                onClose={() => setShowSearch(false)}
                showReplace={showReplace}
            />
            <div className="editor-wrapper">
                <EditorContent editor={editor} className="editor-content" />
                <InlineAI editor={editor} />
            </div>
        </motion.div>
    )
}
