import { Controller, Get, Param, Sse } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('jobs')
export class JobsController {

  constructor(private jobsService: JobsService) {}

  /** SSE endpoint — frontend subscribes to /jobs/:id/logs */
  @Sse(':id/logs')
  streamLogs(@Param('id') id: string): Observable<any> {
    const emitter = this.jobsService.getLogEmitter(id);
    return fromEvent(emitter, 'log').pipe(
      map((data) => ({ data: JSON.stringify({ log: data }) }))
    );
  }
}
