import { z } from "zod";
const text = (max = 200) => z.string().trim().min(1).max(max);
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const partnerSubmissionSchema = z.object({
  requesterName: text(), requesterEmail: z.string().trim().email().max(254), requesterPhone: z.string().trim().max(100), company: text(),
  hotelName: text(), brand: text(), location: text(), address: text(1500), propertyCode: z.string().trim().max(100),
  rooms: z.number().int().min(0).max(20000).nullable(), floors: z.number().int().min(0).max(300).nullable(),
  scope: text(12000), systems: text(2000), existingEquipment: z.string().trim().max(5000), constraints: z.string().trim().max(5000),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s), "Enter a valid date.").or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Confirm that you are authorised to share these details and files." }) })
}).strict();
export type PartnerSubmissionDetails = z.infer<typeof partnerSubmissionSchema>;
export function partnerPrefill(route: { hotelName: string; brand: string; location: string; address: string; propertyCode: string | null }, partner: string) {
  return { hotelName: route.hotelName, brand: route.brand, location: route.location, address: route.address, propertyCode: route.propertyCode ?? "", partner };
}
export function invitationAvailable(invitation: { revokedAt: Date | null; expiresAt: Date }, now = new Date()) {
  return !invitation.revokedAt && invitation.expiresAt > now;
}
