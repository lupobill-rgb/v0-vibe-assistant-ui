import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { storage } from '../storage';

@Injectable()
export class JobsService {
  private logEmitters: Map<string, EventEmitter> = new Map();

  /**
   * Get or create a log emitter for a specific job
   */
  getLogEmitter(jobId: string): EventEmitter {
    if (!this.logEmitters.has(jobId)) {
      const emitter = new EventEmitter();
      this.logEmitters.set(jobId, emitter);
      
      // Start polling for new logs and emit them
      this.pollLogs(jobId, emitter);
    }
    
    return this.logEmitters.get(jobId)!;
  }

  /**
   * Poll for new logs and emit them through the event emitter
   */
  private pollLogs(jobId: string, emitter: EventEmitter): void {
    let lastEventTime = 0;
    
    // Send existing logs immediately
    const existingEvents = storage.getTaskEvents(jobId);
    existingEvents.forEach(event => {
      emitter.emit('log', event);
      lastEventTime = event.event_time;
    });

    // Poll for new logs
    const pollInterval = setInterval(() => {
      try {
        const newEvents = storage.getEventsAfter(jobId, lastEventTime);
        
        newEvents.forEach(event => {
          emitter.emit('log', event);
          lastEventTime = event.event_time;
        });

        // Check if task is in terminal state
        const task = storage.getTask(jobId);
        if (task && (task.execution_state === 'completed' || task.execution_state === 'failed')) {
          // Emit completion event
          emitter.emit('log', { type: 'complete', state: task.execution_state });
          clearInterval(pollInterval);
          // Clean up emitter after some time
          setTimeout(() => this.logEmitters.delete(jobId), 60000);
        }
      } catch (error) {
        console.error(`Error polling logs for job ${jobId}:`, error);
        clearInterval(pollInterval);
        this.logEmitters.delete(jobId);
      }
    }, 1000);
  }

  /**
   * Emit a log event for a specific job
   * This can be called directly when new logs are available
   */
  emitLog(jobId: string, logData: any): void {
    const emitter = this.logEmitters.get(jobId);
    if (emitter) {
      emitter.emit('log', logData);
    }
  }
}
