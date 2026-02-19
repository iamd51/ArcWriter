import { useAppState } from '../store/useAppStore'
import NovelEditor from './NovelEditor'
import ScreenplayEditor from './ScreenplayEditor'

export default function Editor({ filePath: overridePath }) {
    const { activeFilePath } = useAppState()
    const filePath = overridePath || activeFilePath

    if (!filePath) return null

    // Determine editor mode by file extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    const isScreenplay = ext === 'arc'

    return isScreenplay ? <ScreenplayEditor filePath={filePath} /> : <NovelEditor filePath={filePath} />
}
