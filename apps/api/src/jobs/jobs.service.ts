import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { storage } from '../storage';

@Injectable()
export class JobsService {
  private logEmitters = new Map<string, EventEmitter>();

  /**
   * Get or create an EventEmitter for a specific job
   * This emitter will emit 'log' events when new logs are available
   */
  getLogEmitter(jobId: string): EventEmitter {
    if (!this.logEmitters.has(jobId)) {
      const emitter = new EventEmitter();
      this.logEmitters.set(jobId, emitter);
      
      // Start polling for new logs for this job
      this.pollLogsForJob(jobId, emitter);
    }
    return this.logEmitters.get(jobId)!;
  }

  /**
   * Poll for new logs and emit them through the EventEmitter
   */
  private pollLogsForJob(jobId: string, emitter: EventEmitter): void {
    let lastEventTime = 0;
    
    // Delay sending existing logs to ensure Observable is subscribed
    setTimeout(() => {
      // Send existing logs first
      const existingEvents = storage.getTaskEvents(jobId);
      existingEvents.forEach(event => {
        emitter.emit('log', event);
      });
      
      lastEventTime = existingEvents.length > 0 
        ? existingEvents[existingEvents.length - 1].event_time 
        : 0;
    }, 100);

    // Poll for new logs
    const pollInterval = setInterval(() => {
      try {
        const newEvents = storage.getEventsAfter(jobId, lastEventTime);
        
        newEvents.forEach(event => {
          emitter.emit('log', event);
          lastEventTime = event.event_time;
        });

        // Check if task is in terminal state
        const currentTask = storage.getTask(jobId);
        if (currentTask && (currentTask.execution_state === 'completed' || currentTask.execution_state === 'failed')) {
          // Emit completion event
          emitter.emit('log', { type: 'complete', state: currentTask.execution_state });
          clearInterval(pollInterval);
          // Clean up emitter after a delay to allow final messages to be sent
          setTimeout(() => {
            this.logEmitters.delete(jobId);
          }, 5000);
        }
      } catch (error) {
        console.error(`Error polling logs for job ${jobId}:`, error);
        clearInterval(pollInterval);
        this.logEmitters.delete(jobId);
      }
    }, 1000);

    // Set up cleanup on emitter removal
    emitter.on('removeAllListeners', () => {
      clearInterval(pollInterval);
    });
  }
}
