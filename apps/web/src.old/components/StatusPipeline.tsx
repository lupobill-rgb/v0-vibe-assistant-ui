import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface PipelineStage {
  id: string;
  label: string;
}

interface StatusPipelineProps {
  stages: PipelineStage[];
  currentStatus: string;
}

const defaultStages: PipelineStage[] = [
  { id: 'queued', label: 'Queued' },
  { id: 'cloning', label: 'Cloning' },
  { id: 'building_context', label: 'Context' },
  { id: 'calling_llm', label: 'LLM' },
  { id: 'applying_diff', label: 'Apply Diff' },
  { id: 'running_preflight', label: 'Preflight' },
  { id: 'creating_pr', label: 'Create PR' },
  { id: 'completed', label: 'Done' },
];

export default function StatusPipeline({
  stages = defaultStages,
  currentStatus,
}: StatusPipelineProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStatus);
  const isFailed = currentStatus === 'failed';
  const isCompleted = currentStatus === 'completed';

  const failedIndex = isFailed
    ? stages.findIndex((s) => s.id === 'running_preflight')
    : -1;

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const isActive =
          !isFailed && !isCompleted && i === currentIndex;
        const isDone =
          isCompleted
            ? true
            : isFailed
            ? i < failedIndex
            : i < currentIndex;
        const isFail = isFailed && i === failedIndex;
        const isPending = !isDone && !isActive && !isFail;

        return (
          <div
            key={stage.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
              isActive
                ? 'bg-vibe-blue/10 border border-vibe-blue/30'
                : isFail
                ? 'bg-red-500/10 border border-red-500/30'
                : isDone
                ? 'opacity-60'
                : 'opacity-40'
            }`}
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {isFail ? (
                <XCircleIcon className="w-5 h-5 text-red-400" />
              ) : isDone ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : isActive ? (
                <div className="w-3 h-3 rounded-full bg-vibe-blue animate-pulse-slow" />
              ) : (
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPending ? 'bg-white/20' : 'bg-white/40'
                  }`}
                />
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive
                  ? 'text-vibe-blue'
                  : isFail
                  ? 'text-red-400'
                  : isDone
                  ? 'text-white/70'
                  : 'text-white/40'
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
