import { Module } from '@nestjs/common';
import { OrchestratorController } from './orchestrator.controller';
import { PlannerService } from './planner.service';
import { WorkerService } from './worker.service';

@Module({
  controllers: [OrchestratorController],
  providers: [PlannerService, WorkerService],
})
export class OrchestratorModule {}
