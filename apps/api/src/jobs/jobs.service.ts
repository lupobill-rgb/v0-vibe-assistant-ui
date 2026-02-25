import { Injectable } from '@nestjs/common';
import { storage } from '../storage';
import { Observable, Observer } from 'rxjs';
import { LogEmitter } from './log-emitter';

@Injectable()
export class JobsService {
  private logEmitters = new Map<string, LogEmitter>();
  private pollIntervals = new Map<string, NodeJS.Timeout>();
  /**
   * Create an observable that streams logs for a specific job
   */
  getLogStream(jobId: string): Observable<any> {
    return new Observable((observer: Observer<any>) => {
      let lastEventTime = new Date().toISOString();
      let pollInterval: NodeJS.Timeout;

      // Send existing logs immediately
      (async () => {
        const existingEvents = await storage.getTaskEvents(jobId);
        if (existingEvents.length > 0) {
          existingEvents.forEach(event => {
            observer.next(event);
          });
          lastEventTime = existingEvents[existingEvents.length - 1].event_time;
        }

        // Poll for new logs
        pollInterval = setInterval(async () => {
          try {
            const newEvents = await storage.getEventsAfter(jobId, lastEventTime);

            newEvents.forEach(event => {
              observer.next(event);
              lastEventTime = event.event_time;
            });

            // Check if task is in terminal state
            const task = await storage.getTask(jobId);
            if (task && (task.execution_state === 'completed' || task.execution_state === 'failed')) {
              observer.next({ type: 'complete', state: task.execution_state });
              observer.complete();
              clearInterval(pollInterval);
            }
          } catch (error) {
            console.error(`Error polling logs for job ${jobId}:`, error);
            observer.error(error);
            clearInterval(pollInterval);
          }
        }, 1000);
      })();

      // Cleanup on unsubscribe
      return () => {
        if (pollInterval) clearInterval(pollInterval);
      };
    });
  }

  /**
   * Get or create an EventEmitter for a specific job
   */
  getLogEmitter(jobId: string): LogEmitter {
    const existingEmitter = this.logEmitters.get(jobId);
    if (existingEmitter) {
      return existingEmitter;
    }

    const emitter = new LogEmitter();
    this.logEmitters.set(jobId, emitter);
    this.startLogPolling(jobId, emitter);

    return emitter;
  }

  /**
   * Start polling for logs and emit them to the EventEmitter
   */
  private startLogPolling(jobId: string, emitter: LogEmitter): void {
    let lastEventTime = new Date().toISOString();

    // Send existing logs immediately (async)
    (async () => {
      const existingEvents = await storage.getTaskEvents(jobId);
      if (existingEvents.length > 0) {
        existingEvents.forEach(event => {
          emitter.emit(JSON.stringify(event));
        });
        lastEventTime = existingEvents[existingEvents.length - 1].event_time;
      }
    })();

    // Poll for new logs
    const pollInterval = setInterval(async () => {
      try {
        const newEvents = await storage.getEventsAfter(jobId, lastEventTime);

        newEvents.forEach(event => {
          emitter.emit(JSON.stringify(event));
          lastEventTime = event.event_time;
        });

        const task = await storage.getTask(jobId);
        if (task && (task.execution_state === 'completed' || task.execution_state === 'failed')) {
          emitter.emit(JSON.stringify({ type: 'complete', state: task.execution_state }));
          this.cleanupJob(jobId, pollInterval);
        }
      } catch (error) {
        console.error(`Error polling logs for job ${jobId}:`, error);
        this.cleanupJob(jobId, pollInterval);
      }
    }, 1000);

    this.pollIntervals.set(jobId, pollInterval);
  }

  /**
   * Clean up resources for a job
   */
  private cleanupJob(jobId: string, pollInterval: NodeJS.Timeout): void {
    clearInterval(pollInterval);
    this.pollIntervals.delete(jobId);

    setTimeout(() => {
      this.logEmitters.delete(jobId);
    }, 60000);
  }
}
