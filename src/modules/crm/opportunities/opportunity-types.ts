import { OpportunityType } from "@prisma/client";
import type { OpportunityType as OpportunityTypeValue } from "@prisma/client";

export type OpportunityTypeDefinition = {
  value: OpportunityTypeValue;
  label: string;
};

export const opportunityTypeDefinitions: OpportunityTypeDefinition[] = [
  { value: OpportunityType.guest_wifi, label: "Guest WiFi" },
  { value: OpportunityType.cctv_install, label: "CCTV Install" },
  { value: OpportunityType.converged_network_multiple_technologies, label: "Converged Network / Multiple Technologies" },
  { value: OpportunityType.structured_cabling_racks, label: "Structured Cabling & Racks" },
  { value: OpportunityType.project_management, label: "Project Management" },
  { value: OpportunityType.pbx_telephony, label: "PBX & Telephony" },
  { value: OpportunityType.iot_grms, label: "IoT / GRMS" },
  { value: OpportunityType.fibre_broadband, label: "Fibre & Broadband" },
  { value: OpportunityType.av_meeting_room_solutions, label: "AV & Meeting Room Solutions" },
  { value: OpportunityType.matv_tv_headend, label: "MATV & TV Headend" },
  { value: OpportunityType.ups_power_protection, label: "UPS & Power Protection" },
  { value: OpportunityType.digital_signage, label: "Digital Signage" },
  { value: OpportunityType.integration_services, label: "Integration Services" },
  { value: OpportunityType.deployment_services, label: "Deployment Services" },
  { value: OpportunityType.labour_only, label: "Labour Only" },
  { value: OpportunityType.elv_consultancy, label: "ELV Consultancy" },
  { value: OpportunityType.iptv_upgrade, label: "IPTV Upgrade" },
  { value: OpportunityType.marriott_gpns, label: "Marriott GPNS" },
  { value: OpportunityType.other, label: "Other" }
];

export const opportunityTypeValues = opportunityTypeDefinitions.map((definition) => definition.value) as [
  OpportunityTypeValue,
  ...OpportunityTypeValue[]
];

export function getOpportunityTypeLabel(value: OpportunityTypeValue) {
  return opportunityTypeDefinitions.find((definition) => definition.value === value)?.label ?? value;
}
