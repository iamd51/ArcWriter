import { useAppState } from '../store/useAppStore'
import NovelEditor from './NovelEditor'
import ScreenplayEditor from './ScreenplayEditor'

export default function Editor() {
    const { activeFilePath } = useAppState()

    if (!activeFilePath) return null

    // Determine editor mode by file extension
    const ext = activeFilePath.split('.').pop()?.toLowerCase()
    const isScreenplay = ext === 'arc'

    return isScreenplay ? <ScreenplayEditor /> : <NovelEditor />
}
