import { OpportunityType } from "@prisma/client";

export type PresalesTaskTemplate = {
  title: string;
  description?: string;
  isBomTask: boolean;
};

const commonReviewTask = "RFP documentation reviewed and questions raised";
const bomInstruction = "Create or update the Bill of Materials in the connected Quote Builder.";

const templateTitlesByOpportunityType: Partial<Record<OpportunityType, string[]>> = {
  [OpportunityType.guest_wifi]: [
    commonReviewTask,
    "Predictive Heatmap Created",
    "AP locations Created",
    "Network Diagram Created",
    "Port Matrix Created",
    "Bill of Materials Created"
  ],
  [OpportunityType.iptv_upgrade]: [
    commonReviewTask,
    "Network Diagram Created",
    "Port Matrix Created",
    "Scope for GUI, casting, apps and channels agreed",
    "Bill of Materials Created"
  ],
  [OpportunityType.matv_tv_headend]: [
    commonReviewTask,
    "Channel List Created",
    "Dish rig drawing created",
    "Bill of Materials Created"
  ],
  [OpportunityType.fibre_broadband]: [
    commonReviewTask,
    "Bandwidth requirements determined",
    "Quote for partner received",
    "Bill of materials created"
  ],
  [OpportunityType.structured_cabling_racks]: [
    commonReviewTask,
    "Numbers and size of racks determined",
    "Number of cable runs and estimated lengths required",
    "Fibre runs determined",
    "Number of days for 2 man cabling team estimated",
    "Bill of materials created"
  ],
  [OpportunityType.pbx_telephony]: [
    commonReviewTask,
    "Number of IP extension determined",
    "Number of analogue extensions determined",
    "Number of handsets required",
    "IP network requirements",
    "On site or Cloud PBX required",
    "SIP trunks required",
    "Number porting required",
    "Bill of materials created"
  ]
};

export function getPresalesTaskTemplates(opportunityType?: OpportunityType | string | null) {
  if (!opportunityType || !isOpportunityType(opportunityType)) return [];
  return (templateTitlesByOpportunityType[opportunityType] ?? []).map((title) => ({
    title,
    isBomTask: isBomTaskTitle(title),
    description: isBomTaskTitle(title) ? bomInstruction : undefined
  }));
}

export function filterNewPresalesTaskTemplates(templates: PresalesTaskTemplate[], existingTitles: Iterable<string>) {
  const existing = new Set(existingTitles);
  return templates.filter((template) => !existing.has(template.title));
}

export function isBomTaskTitle(title: string) {
  return /\b(bom|bill of materials)\b/i.test(title);
}

export function buildBomTaskDescription(input: { quoteId?: string | null; opportunityId?: string | null }) {
  const parts = [bomInstruction];
  if (input.quoteId) {
    parts.push(`Open Quote Builder: /quotes/${input.quoteId}`);
  } else if (input.opportunityId) {
    parts.push(`Create Quote: /quotes/new?opportunityId=${input.opportunityId}`);
  }
  return parts.join("\n");
}

function isOpportunityType(value: string): value is OpportunityType {
  return Object.values(OpportunityType).includes(value as OpportunityType);
}
