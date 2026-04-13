import { Module } from '@nestjs/common';
import { OrchestratorController } from './orchestrator.controller';
import { ClaudePlanner } from './planner.service';
import { ClaudeWorker } from './worker.service';
import { OrchestratorService } from './orchestrator.service';

@Module({
  controllers: [OrchestratorController],
  providers: [ClaudePlanner, ClaudeWorker, OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
