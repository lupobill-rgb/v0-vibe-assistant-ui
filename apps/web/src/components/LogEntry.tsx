import {
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

interface LogEntryProps {
  timestamp: string;
  message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
}

const severityConfig = {
  info: {
    icon: InformationCircleIcon,
    textClass: 'text-blue-300',
    iconClass: 'text-blue-400',
  },
  success: {
    icon: CheckCircleIcon,
    textClass: 'text-emerald-300 font-semibold',
    iconClass: 'text-emerald-400',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    textClass: 'text-amber-300',
    iconClass: 'text-amber-400',
  },
  error: {
    icon: XCircleIcon,
    textClass: 'text-red-300 font-semibold',
    iconClass: 'text-red-400',
  },
};

export default function LogEntry({ timestamp, message, severity }: LogEntryProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-white/[0.03] rounded transition-colors group">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconClass}`} />
      <span className="text-white/40 text-xs font-mono flex-shrink-0 mt-px">{timestamp}</span>
      <span className={`text-sm font-mono break-all ${config.textClass}`}>{message}</span>
    </div>
  );
}
