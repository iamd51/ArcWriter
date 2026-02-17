import { useEffect, useRef } from 'react'

/**
 * Auto-save hook — debounces 2 seconds after content modification,
 * then calls saveFile for the active file.
 *
 * @param {string|null} activeFilePath
 * @param {Array} openFiles
 * @param {Function} saveFile - async (filePath) => void
 * @param {boolean} enabled - whether auto-save is active
 */
export default function useAutoSave(activeFilePath, openFiles, saveFile, enabled = true) {
    const timerRef = useRef(null)
    const lastContentRef = useRef(null)

    useEffect(() => {
        if (!enabled || !activeFilePath) return

        const file = openFiles.find(f => f.path === activeFilePath)
        if (!file || !file.modified) return

        // Don't re-trigger if content hasn't changed since last save attempt
        if (lastContentRef.current === file.content) return
        lastContentRef.current = file.content

        // Clear any pending timer
        if (timerRef.current) clearTimeout(timerRef.current)

        timerRef.current = setTimeout(() => {
            saveFile(activeFilePath)
        }, 2000)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [activeFilePath, openFiles, saveFile, enabled])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])
}
