import { FolderOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState, useAppActions } from '../store/useAppStore'
import FileTree from './FileTree'
import SearchPanel from './SearchPanel'
import StoryBiblePanel from './StoryBiblePanel'
import AIPanel from './AIPanel'
import SnapshotPanel from './SnapshotPanel'
import SettingsPanel from './SettingsPanel'
import DashboardPanel from './DashboardPanel'
import OutlinePanel from './OutlinePanel'
import RelationshipGraph from './RelationshipGraph'
import '../styles/sidebar.css'

export default function Sidebar() {
    const { sidebarVisible, project, activePanel } = useAppState()
    const { openFolder } = useAppActions()

    return (
        <AnimatePresence>
            {sidebarVisible && (
                <motion.div
                    className="sidebar"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'var(--sidebar-width)', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="sidebar__inner">
                        <div className="sidebar__header">
                            <span className="sidebar__title">
                                {project ? project.name : '未開啟專案'}
                            </span>
                            <button
                                className="sidebar__action"
                                onClick={openFolder}
                                title="開啟資料夾"
                            >
                                <FolderOpen size={15} />
                            </button>
                        </div>

                        <div className="sidebar__content">
                            {activePanel === 'files' && project && (
                                <FileTree items={project.tree} />
                            )}

                            {activePanel === 'files' && !project && (
                                <div className="sidebar__empty">
                                    <p>選擇一個資料夾</p>
                                    <p>開始你的創作旅程</p>
                                    <button className="sidebar__open-btn" onClick={openFolder}>
                                        <FolderOpen size={14} />
                                        開啟資料夾
                                    </button>
                                </div>
                            )}

                            {activePanel === 'search' && (
                                <SearchPanel />
                            )}

                            {activePanel === 'bible' && (
                                <StoryBiblePanel />
                            )}

                            {activePanel === 'ai' && (
                                <AIPanel />
                            )}

                            {activePanel === 'history' && (
                                <SnapshotPanel />
                            )}

                            {activePanel === 'settings' && (
                                <SettingsPanel />
                            )}

                            {activePanel === 'dashboard' && (
                                <DashboardPanel />
                            )}

                            {activePanel === 'outline' && (
                                <OutlinePanel />
                            )}

                            {activePanel === 'relationships' && (
                                <RelationshipGraph />
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
