import { useState, useCallback } from 'react'
import { ChevronRight, Folder, FolderOpen, FileText, File, Clapperboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppActions } from '../store/useAppStore'
import '../styles/filetree.css'

function getFileIcon(name) {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['md', 'markdown', 'txt'].includes(ext)) {
        return <FileText size={15} className="filetree__icon filetree__icon--md" />
    }
    if (ext === 'arc') {
        return <Clapperboard size={15} className="filetree__icon filetree__icon--arc" />
    }
    return <File size={15} className="filetree__icon filetree__icon--file" />
}

function TreeItem({ item, depth = 0, selectedPath, onSelect }) {
    const [expanded, setExpanded] = useState(depth < 1)

    const handleClick = useCallback(() => {
        if (item.type === 'directory') {
            setExpanded(prev => !prev)
        } else {
            onSelect(item.path, item.name)
        }
    }, [item, onSelect])

    const isSelected = selectedPath === item.path

    return (
        <div className="filetree__node">
            <div
                className={`filetree__item ${isSelected ? 'filetree__item--selected' : ''}`}
                style={{ paddingLeft: `${12 + depth * 18}px` }}
                onClick={handleClick}
            >
                {item.type === 'directory' ? (
                    <ChevronRight
                        size={14}
                        className={`filetree__chevron ${expanded ? 'filetree__chevron--open' : ''}`}
                    />
                ) : (
                    <span className="filetree__chevron filetree__chevron--hidden" />
                )}

                {item.type === 'directory' ? (
                    expanded ? (
                        <FolderOpen size={15} className="filetree__icon filetree__icon--folder" />
                    ) : (
                        <Folder size={15} className="filetree__icon filetree__icon--folder" />
                    )
                ) : (
                    getFileIcon(item.name)
                )}

                <span className="filetree__name">{item.name}</span>
            </div>

            <AnimatePresence initial={false}>
                {item.type === 'directory' && expanded && item.children && (
                    <motion.div
                        className="filetree__children"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {item.children.map(child => (
                            <TreeItem
                                key={child.path}
                                item={child}
                                depth={depth + 1}
                                selectedPath={selectedPath}
                                onSelect={onSelect}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function FileTree({ items }) {
    const { openFile } = useAppActions()
    const [selectedPath, setSelectedPath] = useState(null)

    const handleSelect = useCallback((filePath, fileName) => {
        setSelectedPath(filePath)
        openFile(filePath, fileName)
    }, [openFile])

    if (!items || items.length === 0) return null

    return (
        <div className="filetree">
            {items.map(item => (
                <TreeItem
                    key={item.path}
                    item={item}
                    depth={0}
                    selectedPath={selectedPath}
                    onSelect={handleSelect}
                />
            ))}
        </div>
    )
}
