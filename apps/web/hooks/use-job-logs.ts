'use client'

import { useEffect, useState } from 'react'
import { getLogsSSEUrl, type LogEvent } from '@/lib/api'

interface UseJobLogsReturn {
  logs: LogEvent[]
  isComplete: boolean
  taskStatus: string
  error: string | null
}

export function useJobLogs(jobId: string | null): UseJobLogsReturn {
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [taskStatus, setTaskStatus] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) {
      setLogs([])
      setIsComplete(false)
      setTaskStatus('')
      setError(null)
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) {
      setError('Invalid job ID format')
      setIsComplete(true)
      return
    }

    const eventSource = new EventSource(getLogsSSEUrl(jobId))

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'complete') {
          setTaskStatus(data.state)
          setIsComplete(true)
          eventSource.close()
        } else {
          // Unwrap { log: ... } wrapper from NestJS controller if present,
          // otherwise use the event data directly
          const logEntry = data.log ?? data
          setLogs((prev) => [...prev, logEntry])
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      // If we already received logs, the job ran — don't show a connection error.
      // This prevents false "Failed to connect" messages when SSE drops after completion.
      setLogs((prev) => {
        if (prev.length === 0) {
          setError('Failed to connect to log stream')
        }
        return prev
      })
      setIsComplete(true)
    }

    return () => {
      eventSource.close()
    }
  }, [jobId])

  return { logs, isComplete, taskStatus, error }
}
