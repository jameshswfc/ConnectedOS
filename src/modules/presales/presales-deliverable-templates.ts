import { OpportunityType, type PresalesDeliverableType } from "@prisma/client";

export type PresalesDeliverableTemplate = {
  deliverableType: PresalesDeliverableType;
  title: string;
  description?: string;
  isBomDeliverable: boolean;
};

const commonReviewDeliverable = "RFP documentation reviewed and questions raised";
const bomInstruction = "Create or update the Bill of Materials in the connected Quote Builder.";

const templatesByOpportunityType: Partial<Record<OpportunityType, PresalesDeliverableTemplate[]>> = {
  [OpportunityType.guest_wifi]: [
    template("rfp_review", commonReviewDeliverable),
    template("guest_wifi_heatmap", "Predictive Heatmap Created"),
    template("ap_locations", "AP locations Created"),
    template("network_diagram", "Network Diagram Created"),
    template("port_matrix", "Port Matrix Created"),
    template("bill_of_materials", "Bill of Materials Created")
  ],
  [OpportunityType.iptv_upgrade]: [
    template("rfp_review", commonReviewDeliverable),
    template("network_diagram", "Network Diagram Created"),
    template("port_matrix", "Port Matrix Created"),
    template("gui_scope", "Scope for GUI, casting, apps and channels agreed"),
    template("bill_of_materials", "Bill of Materials Created")
  ],
  [OpportunityType.matv_tv_headend]: [
    template("rfp_review", commonReviewDeliverable),
    template("channel_list", "Channel List Created"),
    template("dish_rig_drawing", "Dish rig drawing created"),
    template("bill_of_materials", "Bill of Materials Created")
  ],
  [OpportunityType.fibre_broadband]: [
    template("rfp_review", commonReviewDeliverable),
    template("bandwidth_assessment", "Bandwidth requirements determined"),
    template("partner_quote", "Quote for partner received"),
    template("bill_of_materials", "Bill of Materials Created")
  ],
  [OpportunityType.structured_cabling_racks]: [
    template("rfp_review", commonReviewDeliverable),
    template("rack_count", "Numbers and size of racks determined"),
    template("cable_runs", "Number of cable runs and estimated lengths required"),
    template("fibre_runs", "Fibre runs determined"),
    template("cabling_days", "Number of days for 2 man cabling team estimated"),
    template("bill_of_materials", "Bill of Materials Created")
  ],
  [OpportunityType.pbx_telephony]: [
    template("rfp_review", commonReviewDeliverable),
    template("ip_extensions", "Number of IP extensions determined"),
    template("analogue_extensions", "Number of analogue extensions determined"),
    template("handsets", "Number of handsets required"),
    template("ip_network_requirements", "IP network requirements determined"),
    template("pbx_requirement", "On site or Cloud PBX required"),
    template("sip_trunks", "SIP trunks required"),
    template("number_porting", "Number porting required"),
    template("bill_of_materials", "Bill of Materials Created")
  ]
};

export function getExpectedPresalesDeliverables(opportunityType?: OpportunityType | null) {
  return opportunityType ? templatesByOpportunityType[opportunityType] ?? [] : [];
}

export function filterNewPresalesDeliverableTemplates(templates: PresalesDeliverableTemplate[], existingTitles: Iterable<string>) {
  const existing = new Set(existingTitles);
  return templates.filter((template) => !existing.has(template.title));
}

export function isBomDeliverableTitle(title: string) {
  return /\b(bom|bill of materials)\b/i.test(title);
}

export function buildBomDeliverableDescription(input: { quoteId?: string | null; opportunityId?: string | null }) {
  const parts = [bomInstruction];
  if (input.quoteId) {
    parts.push(`Open Quote Builder: /quotes/${input.quoteId}`);
  } else if (input.opportunityId) {
    parts.push(`Create Quote: /quotes/new?opportunityId=${input.opportunityId}`);
  }
  return parts.join("\n");
}

export function calculateDeliverableProgress(deliverables: { documentId?: string | null; status?: string | null }[]) {
  const required = deliverables.length;
  const complete = deliverables.filter((deliverable) => deliverable.status === "complete" || deliverable.status === "not_required" || Boolean(deliverable.documentId)).length;
  const uploaded = deliverables.filter((deliverable) => Boolean(deliverable.documentId)).length;
  const percent = required === 0 ? 100 : Math.round((complete / required) * 100);
  return { required, uploaded, complete, percent };
}

function template(deliverableType: PresalesDeliverableType, title: string): PresalesDeliverableTemplate {
  const isBomDeliverable = isBomDeliverableTitle(title);
  return {
    deliverableType,
    title,
    isBomDeliverable,
    description: isBomDeliverable ? bomInstruction : undefined
  };
}
