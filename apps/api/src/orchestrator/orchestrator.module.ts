import { Module } from '@nestjs/common';
import { ClaudePlanner } from '../planner/claude-planner.service';
import { ClaudeWorker } from '../worker/claude-worker.service';
import { OrchestratorService } from './orchestrator.service';

@Module({
  providers: [ClaudePlanner, ClaudeWorker, OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
