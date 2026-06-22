import { HelpdeskCommentVisibility, HelpdeskImpact, HelpdeskPriority, HelpdeskTicketCategory, HelpdeskTicketSource, HelpdeskTicketStatus, HelpdeskTicketType, HelpdeskUrgency, KnowledgeArticleStatus } from "@prisma/client";
import { z } from "zod";

export const helpdeskTicketCreateSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  raisedByName: z.string().optional().nullable(),
  raisedByEmail: z.string().email().optional().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
  ticketType: z.nativeEnum(HelpdeskTicketType),
  category: z.nativeEnum(HelpdeskTicketCategory),
  priority: z.nativeEnum(HelpdeskPriority).default(HelpdeskPriority.normal),
  impact: z.nativeEnum(HelpdeskImpact).default(HelpdeskImpact.low),
  urgency: z.nativeEnum(HelpdeskUrgency).default(HelpdeskUrgency.low),
  assignedToId: z.string().uuid().optional().nullable(),
  queueId: z.string().uuid().optional().nullable(),
  source: z.nativeEnum(HelpdeskTicketSource).default(HelpdeskTicketSource.manual)
});

export const helpdeskTicketUpdateSchema = helpdeskTicketCreateSchema.partial().extend({
  status: z.nativeEnum(HelpdeskTicketStatus).optional(),
  resolutionNote: z.string().trim().optional()
});

export const helpdeskCommentSchema = z.object({
  visibility: z.nativeEnum(HelpdeskCommentVisibility).default(HelpdeskCommentVisibility.internal),
  body: z.string().min(1)
});

export const helpdeskQueueSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  active: z.coerce.boolean().default(true)
});

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional().nullable(),
  body: z.string().min(1),
  status: z.nativeEnum(KnowledgeArticleStatus).default(KnowledgeArticleStatus.draft)
});
