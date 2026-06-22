import {
  PresalesCommercialPriority,
  PresalesPriority,
  PresalesRagStatus,
  PresalesRequestCategory,
  PresalesRequestStatus,
  PresalesRequestType,
  PresalesSlaStatus,
  PresalesTaskStatus
} from "@prisma/client";

export const presalesCategoryDefinitions = [
  { value: PresalesRequestCategory.network, label: "Network" },
  { value: PresalesRequestCategory.wi_fi, label: "Wi-Fi" },
  { value: PresalesRequestCategory.iptv, label: "IPTV" },
  { value: PresalesRequestCategory.structured_cabling, label: "Structured Cabling" },
  { value: PresalesRequestCategory.elv, label: "ELV" },
  { value: PresalesRequestCategory.security, label: "Security" },
  { value: PresalesRequestCategory.guest_room_technology, label: "Guest Room Technology" },
  { value: PresalesRequestCategory.digital_signage, label: "Digital Signage" },
  { value: PresalesRequestCategory.audio_visual, label: "Audio Visual" },
  { value: PresalesRequestCategory.consultancy, label: "Consultancy" },
  { value: PresalesRequestCategory.multi_discipline, label: "Multi-Discipline" }
] as const;

export const presalesTypeDefinitions = [
  { value: PresalesRequestType.wifi_design, label: "Wi-Fi Design" },
  { value: PresalesRequestType.iptv_design, label: "IPTV Design" },
  { value: PresalesRequestType.structured_cabling, label: "Structured Cabling" },
  { value: PresalesRequestType.elv, label: "ELV" },
  { value: PresalesRequestType.consultancy, label: "Consultancy" },
  { value: PresalesRequestType.survey, label: "Survey" },
  { value: PresalesRequestType.rfp_analysis, label: "RFP Analysis" },
  { value: PresalesRequestType.design_review, label: "Design Review" },
  { value: PresalesRequestType.bom_review, label: "BoM Review" },
  { value: PresalesRequestType.proposal_support, label: "Proposal Support" }
] as const;

export const presalesPriorityDefinitions = [
  { value: PresalesPriority.low, label: "Low" },
  { value: PresalesPriority.normal, label: "Normal" },
  { value: PresalesPriority.high, label: "High" },
  { value: PresalesPriority.urgent, label: "Urgent" }
] as const;

export const presalesCommercialPriorityDefinitions = [
  { value: PresalesCommercialPriority.low, label: "Low" },
  { value: PresalesCommercialPriority.normal, label: "Normal" },
  { value: PresalesCommercialPriority.high, label: "High" },
  { value: PresalesCommercialPriority.strategic, label: "Strategic" }
] as const;

export const presalesStatusDefinitions = [
  { value: PresalesRequestStatus.submitted, label: "Submitted" },
  { value: PresalesRequestStatus.triage, label: "Triage" },
  { value: PresalesRequestStatus.assigned, label: "Assigned" },
  { value: PresalesRequestStatus.in_progress, label: "In Progress" },
  { value: PresalesRequestStatus.query_raised, label: "Query Raised" },
  { value: PresalesRequestStatus.waiting_customer, label: "Waiting Customer" },
  { value: PresalesRequestStatus.internal_review, label: "Internal Review" },
  { value: PresalesRequestStatus.complete, label: "Complete" },
  { value: PresalesRequestStatus.cancelled, label: "Cancelled" }
] as const;

export const presalesTaskStatusDefinitions = [
  { value: PresalesTaskStatus.open, label: "Open" },
  { value: PresalesTaskStatus.in_progress, label: "In Progress" },
  { value: PresalesTaskStatus.complete, label: "Complete" },
  { value: PresalesTaskStatus.cancelled, label: "Cancelled" }
] as const;

export const presalesSlaStatusLabels: Record<PresalesSlaStatus, string> = {
  [PresalesSlaStatus.on_track]: "On Track",
  [PresalesSlaStatus.due_soon]: "Due Soon",
  [PresalesSlaStatus.overdue]: "Overdue",
  [PresalesSlaStatus.complete]: "Complete"
};

export const presalesRagStatusLabels: Record<PresalesRagStatus, string> = {
  [PresalesRagStatus.green]: "Green",
  [PresalesRagStatus.amber]: "Amber",
  [PresalesRagStatus.red]: "Red"
};

export function labelPresalesValue(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

