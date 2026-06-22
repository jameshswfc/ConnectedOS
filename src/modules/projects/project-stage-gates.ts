import { ProjectDeliveryStage, StageGateStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const DEFAULT_PROJECT_STAGE_GATES = [
  ProjectDeliveryStage.initiation,
  ProjectDeliveryStage.planning,
  ProjectDeliveryStage.delivery,
  ProjectDeliveryStage.validation,
  ProjectDeliveryStage.handover,
  ProjectDeliveryStage.closure
] as const;

export async function createMissingDefaultStageGates(transaction: Prisma.TransactionClient, projectId: string) {
  const existing = await transaction.projectStageGate.findMany({ where: { projectId }, select: { stage: true } });
  const existingStages = new Set(existing.map((gate) => gate.stage));
  for (const stage of DEFAULT_PROJECT_STAGE_GATES) {
    if (existingStages.has(stage)) continue;
    await transaction.projectStageGate.create({
      data: {
        projectId,
        stage,
        status: stage === ProjectDeliveryStage.initiation ? StageGateStatus.in_progress : StageGateStatus.not_started
      }
    });
  }
}

export function stageGateLabel(stage: ProjectDeliveryStage | string) {
  return String(stage).replaceAll("_", " ");
}
