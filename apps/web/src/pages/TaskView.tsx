import { useParams } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'
import { PipelineTracker } from '../components/task/PipelineTracker'
import { TerminalConsole } from '../components/task/TerminalConsole'

export function TaskView() {
  const { taskId } = useParams<{ taskId: string }>()

  if (!taskId) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: pipeline steps */}
        <div className="w-[340px] flex-shrink-0">
          <PipelineTracker taskId={taskId} />
        </div>
        {/* Right: live logs */}
        <div className="flex-1 min-w-0">
          <TerminalConsole taskId={taskId} />
        </div>
      </div>
    </div>
  )
}
