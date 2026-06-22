import { PresalesRequestStatus } from "@prisma/client";

export function isPresalesComplete(status: PresalesRequestStatus | string) {
  return status === PresalesRequestStatus.complete;
}

export function isPresalesCancelled(status: PresalesRequestStatus | string) {
  return status === PresalesRequestStatus.cancelled;
}

export function isPresalesActive(status: PresalesRequestStatus | string) {
  return !isPresalesComplete(status) && !isPresalesCancelled(status);
}
