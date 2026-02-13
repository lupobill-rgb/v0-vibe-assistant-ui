import { Injectable } from '@nestjs/common';
import { storage } from '../storage';
import { Observable, Observer } from 'rxjs';

@Injectable()
export class JobsService {
  /**
   * Create an observable that streams logs for a specific job
   */
  getLogStream(jobId: string): Observable<any> {
    return new Observable((observer: Observer<any>) => {
      let lastEventTime = 0;
      let pollInterval: NodeJS.Timeout;
      
      // Send existing logs immediately
      const existingEvents = storage.getTaskEvents(jobId);
      existingEvents.forEach(event => {
        observer.next(event);
        lastEventTime = event.event_time;
      });

      // Poll for new logs
      pollInterval = setInterval(() => {
        try {
          const newEvents = storage.getEventsAfter(jobId, lastEventTime);
          
          newEvents.forEach(event => {
            observer.next(event);
            lastEventTime = event.event_time;
          });

          // Check if task is in terminal state
          const task = storage.getTask(jobId);
          if (task && (task.execution_state === 'completed' || task.execution_state === 'failed')) {
            // Send completion event
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

      // Cleanup on unsubscribe
      return () => {
        clearInterval(pollInterval);
      };
    });
  }
}
