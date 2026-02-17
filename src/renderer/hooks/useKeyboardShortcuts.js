import { useEffect, useCallback } from 'react'

/**
 * Centralized keyboard shortcut manager.
 * Handles all global shortcuts in one place.
 *
 * @param {Object} actions - Map of action names to handler functions
 * @param {Object} deps - Dependencies for the handlers
 */
export default function useKeyboardShortcuts({
    onNewFile,
    onSave,
    onSaveAs,
    onCloseTab,
    onNextTab,
    onPrevTab,
    onFind,
    onReplace,
    onCrossFileSearch,
    onCommandPalette,
    onToggleSidebar,
}) {
    useEffect(() => {
        const handler = (e) => {
            const ctrl = e.ctrlKey || e.metaKey

            // Ctrl+N - new file
            if (ctrl && e.key === 'n' && !e.shiftKey) {
                e.preventDefault()
                onNewFile?.()
                return
            }

            // Ctrl+S - save
            if (ctrl && e.key === 's' && !e.shiftKey) {
                e.preventDefault()
                onSave?.()
                return
            }

            // Ctrl+Shift+S - save as
            if (ctrl && e.shiftKey && e.key === 'S') {
                e.preventDefault()
                onSaveAs?.()
                return
            }

            // Ctrl+W - close tab
            if (ctrl && e.key === 'w') {
                e.preventDefault()
                onCloseTab?.()
                return
            }

            // Ctrl+Tab - next tab
            if (ctrl && e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                onNextTab?.()
                return
            }

            // Ctrl+Shift+Tab - prev tab
            if (ctrl && e.shiftKey && e.key === 'Tab') {
                e.preventDefault()
                onPrevTab?.()
                return
            }

            // Ctrl+F - find (handled in NovelEditor/ScreenplayEditor directly)
            if (ctrl && e.key === 'f' && !e.shiftKey) {
                // Don't prevent — let it bubble to editor-level handlers
                return
            }

            // Ctrl+H - replace (handled in editors)
            if (ctrl && e.key === 'h') {
                return
            }

            // Ctrl+Shift+F - cross-file search
            if (ctrl && e.shiftKey && e.key === 'F') {
                e.preventDefault()
                onCrossFileSearch?.()
                return
            }

            // Ctrl+P - command palette
            if (ctrl && e.key === 'p') {
                e.preventDefault()
                onCommandPalette?.()
                return
            }

            // Ctrl+B - toggle sidebar
            if (ctrl && e.key === 'b') {
                e.preventDefault()
                onToggleSidebar?.()
                return
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onNewFile, onSave, onSaveAs, onCloseTab, onNextTab, onPrevTab,
        onFind, onReplace, onCrossFileSearch, onCommandPalette, onToggleSidebar])
}
