import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';

export type PipelineStage = 'queued' | 'running' | 'completed' | 'failed';

interface StatusPipelineProps {
  stage: PipelineStage;
}

const stageConfig: Record<
  PipelineStage,
  { label: string; color: string; bgColor: string; icon: typeof ClockIcon }
> = {
  queued: {
    label: 'Queued',
    color: 'text-text-muted',
    bgColor: 'bg-surface-alt',
    icon: ClockIcon,
  },
  running: {
    label: 'Running',
    color: 'text-info',
    bgColor: 'bg-info/10',
    icon: ArrowPathIcon,
  },
  completed: {
    label: 'Completed',
    color: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircleIcon,
  },
  failed: {
    label: 'Failed',
    color: 'text-error',
    bgColor: 'bg-error/10',
    icon: ExclamationCircleIcon,
  },
};

const stages: PipelineStage[] = ['queued', 'running', 'completed'];

export default function StatusPipeline({ stage }: StatusPipelineProps) {
  const currentIdx = stages.indexOf(stage === 'failed' ? 'completed' : stage);
  const config = stageConfig[stage];

  return (
    <div className="flex flex-col gap-3">
      {/* Current status badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${config.bgColor} ${config.color}`}
      >
        <config.icon
          className={`h-3.5 w-3.5 ${stage === 'running' ? 'animate-spin' : ''}`}
        />
        {config.label}
      </div>

      {/* Pipeline bar */}
      <div className="flex items-center gap-1">
        {stages.map((s, i) => {
          const reached = i <= currentIdx;
          const isFailed = stage === 'failed' && i === currentIdx;
          return (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                isFailed
                  ? 'bg-error'
                  : reached
                    ? 'bg-primary'
                    : 'bg-surface-alt'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
