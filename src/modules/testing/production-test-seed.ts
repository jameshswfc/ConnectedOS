import {
  AccountStatus,
  AccountType,
  BookingConflictStatus,
  ContactStatus,
  DocumentStorageProvider,
  ExpenseCategory,
  ExpenseClaimStatus,
  HelpdeskImpact,
  HelpdeskPriority,
  HelpdeskSlaStatus,
  HelpdeskTicketCategory,
  HelpdeskTicketSource,
  HelpdeskTicketStatus,
  HelpdeskTicketType,
  HelpdeskUrgency,
  LeaveStatus,
  LeaveType,
  OpportunitySource,
  OpportunityStage,
  OpportunityStatus,
  OpportunityType,
  PermissionLevel,
  PresalesCommercialPriority,
  PresalesDeliverableStatus,
  PresalesPriority,
  PresalesRagStatus,
  PresalesRequestCategory,
  PresalesRequestStatus,
  PresalesRequestType,
  PresalesSlaStatus,
  ProjectStatus,
  PurchaseOrderStatus,
  QuoteLineType,
  QuoteStatus,
  ResourceBookingStatus,
  ResourceBookingType,
  ResourceType,
  SupplierInvoiceStatus,
  type Prisma,
  type PrismaClient
} from "@prisma/client";
import { hashPassword } from "@/services/auth/password-service";
import { createProjectFromQuote, createProjectResource } from "@/modules/projects/project-service";
import { ensureDefaultProjectBillingSchedule } from "@/modules/finance/finance-service";
import { syncActiveUsersToResources } from "@/modules/field-services/field-services-service";

type SeedSummary = {
  users: number;
  accounts: number;
  contacts: number;
  opportunities: number;
  quotes: number;
  projects: number;
  presalesRequests: number;
  resources: number;
  resourceBookings: number;
  leaveRequests: number;
  expenseClaims: number;
  suppliers: number;
  purchaseOrders: number;
  customerInvoices: number;
  assets: number;
  helpdeskTickets: number;
  notifications: number;
};

type CleanupSummary = {
  usersRemoved: number;
  accountsRemoved: number;
  projectsRemoved: number;
  resourcesRemoved: number;
  bookingsRemoved: number;
  projectAssignmentsRemoved: number;
  notificationsRemoved: number;
};

type SeedContext = {
  userId: string;
  permissions: string[];
  permissionLevel: PermissionLevel;
  role: string;
};

const DEFAULT_PASSWORD = "ConnectedOS2026";
const quoteTerms = "Quote is valid for 30 days from date of issue.\nPayment terms are 75% upfront, 25% on completion unless stated otherwise.";
const productionTestSeedDefinition = {
  userEmails: [
    "operations-admin@connectedhsp.test",
    "amelia.clarke@connectedhsp.test",
    "priya.shah@connectedhsp.test",
    "olivia.reed@connectedhsp.test",
    "sarah.dale@connectedhsp.test"
  ],
  accountNames: [
    "Hilton Manchester Airport",
    "Marriott Manchester Piccadilly"
  ],
  opportunityNames: [
    "Hilton Manchester Airport Guest WiFi Refresh",
    "Marriott GPNS Manchester Deployment",
    "Hilton Manchester Airport Structured Cabling Remedials",
    "Hilton Manchester Airport IPTV Expansion"
  ],
  quoteNumbers: ["Q-2026-9001", "Q-2026-9002", "Q-2026-9003"],
  requestNumbers: ["PS-2026-9001", "PS-2026-9002"],
  projectQuoteNumbers: ["Q-2026-9002", "Q-2026-9003"],
  poNumbers: ["PO-2026-9001", "PO-2026-9002"],
  invoiceNumbers: ["INV-2026-9001", "INV-2026-9002"],
  expenseClaimNumbers: ["EXP-2026-9001", "EXP-2026-9002"],
  assetNumbers: ["AST-2026-9001", "AST-2026-9002", "AST-2026-9003"],
  helpdeskTicketNumbers: ["HD-2026-9001", "HD-2026-9002"],
  resourceNames: [
    "Skyline Cabling Ltd",
    "NorthWest WiFi Surveys",
    "Operations Admin",
    "Amelia Clarke",
    "Priya Shah",
    "Olivia Reed",
    "Sarah Dale"
  ],
  resourceBookingTitles: [
    "Marriott GPNS kickoff and governance",
    "Hilton cabling deployment survey",
    "Hilton IPTV survey"
  ],
  notificationTitles: [
    "Quote awaiting customer response",
    "Project mobilisation ready",
    "Purchase order delivery due",
    "Approved expenses awaiting payment",
    "Assigned helpdesk ticket"
  ]
} as const;
const productionTestCleanupDefinition = {
  ...productionTestSeedDefinition,
  userEmails: [
    ...productionTestSeedDefinition.userEmails,
    "liam.turner@connectedhsp.test",
    "marcus.webb@connectedhsp.test",
    "daniel.price@connectedhsp.test",
    "hannah.cole@connectedhsp.test"
  ],
  accountNames: [
    ...productionTestSeedDefinition.accountNames,
    "Native Places Birmingham"
  ],
  opportunityNames: [
    ...productionTestSeedDefinition.opportunityNames,
    "Native Birmingham Structured Cabling Remedials",
    "Native Birmingham AV Consultancy"
  ],
  assetNumbers: [
    ...productionTestSeedDefinition.assetNumbers,
    "AST-2026-9004",
    "AST-2026-9005"
  ],
  helpdeskTicketNumbers: [
    ...productionTestSeedDefinition.helpdeskTicketNumbers,
    "HD-2026-9003",
    "HD-2026-9004",
    "HD-2026-9005"
  ],
  resourceNames: [
    ...productionTestSeedDefinition.resourceNames,
    "Liam Turner",
    "Marcus Webb",
    "Daniel Price",
    "Hannah Cole"
  ]
} as const;

export async function seedProductionTestData(prisma: PrismaClient): Promise<SeedSummary> {
  const admin = await ensureUser(prisma, {
    email: "operations-admin@connectedhsp.test",
    displayName: "Operations Admin",
    roleName: "Administrator",
    permissionLevel: PermissionLevel.administrator,
    password: DEFAULT_PASSWORD
  });
  const salesOne = await ensureUser(prisma, {
    email: "amelia.clarke@connectedhsp.test",
    displayName: "Amelia Clarke",
    roleName: "Sales",
    permissionLevel: PermissionLevel.user,
    password: DEFAULT_PASSWORD
  });
  const presalesEngineer = await ensureUser(prisma, {
    email: "priya.shah@connectedhsp.test",
    displayName: "Priya Shah",
    roleName: "Pre-Sales",
    permissionLevel: PermissionLevel.user,
    password: DEFAULT_PASSWORD
  });
  const projectManager = await ensureUser(prisma, {
    email: "olivia.reed@connectedhsp.test",
    displayName: "Olivia Reed",
    roleName: "Project Manager",
    permissionLevel: PermissionLevel.user,
    password: DEFAULT_PASSWORD
  });
  const businessOps = await ensureUser(prisma, {
    email: "sarah.dale@connectedhsp.test",
    displayName: "Sarah Dale",
    roleName: "Business Operations",
    permissionLevel: PermissionLevel.user,
    password: DEFAULT_PASSWORD
  });

  const adminContext: SeedContext = {
    userId: admin.id,
    permissions: ["admin.users"],
    permissionLevel: PermissionLevel.administrator,
    role: "Administrator"
  };

  const accountHilton = await ensureAccount(prisma, {
    name: "Hilton Manchester Airport",
    ownerId: salesOne.id,
    createdById: admin.id,
    status: AccountStatus.active_customer,
    accountType: AccountType.customer,
    website: "https://www.hilton.com",
    phone: "+44 161 437 6811",
    addressLine1: "Outwood Lane",
    city: "Manchester",
    county: "Greater Manchester",
    postcode: "M90 4WP",
    country: "United Kingdom",
    industry: "Hospitality",
    notes: "Production test seed account for airport hotel delivery and support workflows."
  });
  const accountMarriott = await ensureAccount(prisma, {
    name: "Marriott Manchester Piccadilly",
    ownerId: salesOne.id,
    createdById: admin.id,
    status: AccountStatus.active_customer,
    accountType: AccountType.customer,
    website: "https://www.marriott.com",
    phone: "+44 161 272 3200",
    addressLine1: "London Road",
    city: "Manchester",
    county: "Greater Manchester",
    postcode: "M1 2PG",
    country: "United Kingdom",
    industry: "Hospitality"
  });

  const contacts = await Promise.all([
    ensureContact(prisma, accountHilton.id, {
      firstName: "Rebecca",
      lastName: "Moore",
      email: "rebecca.moore@hilton-manchester.test",
      jobTitle: "Director of Operations",
      phone: "+44 161 555 1001",
      isPrimary: true
    }),
    ensureContact(prisma, accountHilton.id, {
      firstName: "Tom",
      lastName: "Harrison",
      email: "tom.harrison@hilton-manchester.test",
      jobTitle: "IT Manager",
      phone: "+44 161 555 1002"
    }),
    ensureContact(prisma, accountMarriott.id, {
      firstName: "Sophie",
      lastName: "Grant",
      email: "sophie.grant@marriott-mcr.test",
      jobTitle: "General Manager",
      phone: "+44 161 555 2001",
      isPrimary: true
    }),
    ensureContact(prisma, accountMarriott.id, {
      firstName: "Alex",
      lastName: "Bennett",
      email: "alex.bennett@marriott-mcr.test",
      jobTitle: "IT Projects Lead",
      phone: "+44 161 555 2002"
    })
  ]);

  const hiltonPrimary = contacts[0];
  const marriottPrimary = contacts[2];

  const opportunities = await Promise.all([
    ensureOpportunity(prisma, {
      accountId: accountHilton.id,
      primaryContactId: hiltonPrimary.id,
      ownerId: salesOne.id,
      opportunityName: "Hilton Manchester Airport Guest WiFi Refresh",
      opportunityType: OpportunityType.guest_wifi,
      stage: OpportunityStage.proposal_sent,
      status: OpportunityStatus.open,
      value: 38250,
      probabilityPercent: 60,
      expectedCloseDate: dateOnly("2026-07-18"),
      nextActionDate: dateOnly("2026-06-22"),
      lastActivityAt: new Date("2026-06-12T10:00:00Z"),
      source: OpportunitySource.existing_customer,
      notes: "Customer has received a refreshed commercial proposal for airport property WiFi upgrade."
    }),
    ensureOpportunity(prisma, {
      accountId: accountMarriott.id,
      primaryContactId: marriottPrimary.id,
      ownerId: salesOne.id,
      opportunityName: "Marriott GPNS Manchester Deployment",
      opportunityType: OpportunityType.marriott_gpns,
      stage: OpportunityStage.closed_won_po_received,
      status: OpportunityStatus.won,
      value: 124800,
      probabilityPercent: 100,
      expectedCloseDate: dateOnly("2026-06-05"),
      nextActionDate: dateOnly("2026-06-16"),
      wonDate: dateOnly("2026-06-05"),
      lastActivityAt: new Date("2026-06-13T09:30:00Z"),
      source: OpportunitySource.referral,
      notes: "Marriott brand programme with accepted commercial scope and pre-sales handover."
    }),
    ensureOpportunity(prisma, {
      accountId: accountHilton.id,
      primaryContactId: contacts[1].id,
      ownerId: salesOne.id,
      opportunityName: "Hilton Manchester Airport Structured Cabling Remedials",
      opportunityType: OpportunityType.structured_cabling_racks,
      stage: OpportunityStage.closed_won_po_received,
      status: OpportunityStatus.won,
      value: 58750,
      probabilityPercent: 100,
      expectedCloseDate: dateOnly("2026-06-08"),
      nextActionDate: dateOnly("2026-06-20"),
      wonDate: dateOnly("2026-06-08"),
      lastActivityAt: new Date("2026-06-12T15:45:00Z"),
      source: OpportunitySource.existing_customer,
      notes: "Remedial structured cabling, racks and deployment works across plant and back-of-house areas."
    }),
    ensureOpportunity(prisma, {
      accountId: accountHilton.id,
      primaryContactId: contacts[1].id,
      ownerId: salesOne.id,
      opportunityName: "Hilton Manchester Airport IPTV Expansion",
      opportunityType: OpportunityType.iptv_upgrade,
      stage: OpportunityStage.pre_sales_solution_design,
      status: OpportunityStatus.open,
      value: 44500,
      probabilityPercent: 45,
      expectedCloseDate: dateOnly("2026-08-12"),
      nextActionDate: dateOnly("2026-06-25"),
      lastActivityAt: new Date("2026-06-11T11:15:00Z"),
      source: OpportunitySource.existing_customer,
      notes: "Scope under review for guestroom casting and channel package refresh."
    })
  ]);

  const products = await Promise.all([
    ensureProduct(prisma, { sku: "AP-U7-PRO", manufacturer: "Ubiquiti", supplier: "Ubiquiti Distribution UK", category: "Wireless", description: "Ubiquiti WiFi 7 access point", itemType: "product", costPrice: 210, defaultSellPrice: 273 }),
    ensureProduct(prisma, { sku: "SW-48P-POE", manufacturer: "Aruba", supplier: "Aruba Networks UK", category: "Switching", description: "48 port PoE core switch", itemType: "product", costPrice: 1640, defaultSellPrice: 2132 }),
    ensureProduct(prisma, { sku: "LAB-PM-DAY", manufacturer: "Connected Hospitality", supplier: "Connected Hospitality", category: "Project Management", description: "Project management day rate", itemType: "labour", costPrice: 325, defaultSellPrice: 650 }),
    ensureProduct(prisma, { sku: "LAB-ENG-DAY", manufacturer: "Connected Hospitality", supplier: "Connected Hospitality", category: "Engineering", description: "Project engineer day rate", itemType: "labour", costPrice: 280, defaultSellPrice: 560 }),
    ensureProduct(prisma, { sku: "LAB-INSTALL-DAY", manufacturer: "Connected Hospitality", supplier: "Connected Hospitality", category: "Installation", description: "Field installation day rate", itemType: "labour", costPrice: 240, defaultSellPrice: 480 }),
    ensureProduct(prisma, { sku: "CAB-CAT6-305", manufacturer: "Excel", supplier: "Network Cabling Supplies Ltd", category: "Cabling", description: "CAT6 UTP cable box 305m", itemType: "product", costPrice: 88, defaultSellPrice: 114.4 })
  ]);

  const quoteOne = await ensureQuote(prisma, {
    quoteNumber: "Q-2026-9001",
    title: "Hilton Manchester Airport Guest WiFi Refresh",
    projectName: "Hilton Airport WiFi Refresh",
    highLevelScope: "Replace guest WiFi access layer, core switching uplift and staged hotel deployment.",
    accountId: accountHilton.id,
    opportunityId: opportunities[0].id,
    contactId: hiltonPrimary.id,
    ownerId: salesOne.id,
    status: QuoteStatus.sent,
    preparedDate: dateOnly("2026-06-12"),
    sentAt: new Date("2026-06-13T09:00:00Z"),
    notes: "Customer-facing commercial proposal awaiting response.",
    lines: [
      { productId: products[0].id, lineType: QuoteLineType.product, description: "Ubiquiti WiFi 7 access points", quantity: 42, unitCost: 210, unitSell: 273 },
      { productId: products[1].id, lineType: QuoteLineType.product, description: "Core PoE switching", quantity: 4, unitCost: 1640, unitSell: 2132 },
      { productId: products[3].id, lineType: QuoteLineType.labour, description: "Engineering configuration and commissioning", quantity: 6, unitCost: 280, unitSell: 560 }
    ]
  });
  const quoteTwo = await ensureQuote(prisma, {
    quoteNumber: "Q-2026-9002",
    title: "Marriott GPNS Manchester Deployment",
    projectName: "Marriott GPNS Rollout",
    highLevelScope: "Deliver Marriott GPNS deployment including switch refresh, access points and certification support.",
    accountId: accountMarriott.id,
    opportunityId: opportunities[1].id,
    contactId: marriottPrimary.id,
    ownerId: salesOne.id,
    status: QuoteStatus.accepted,
    preparedDate: dateOnly("2026-06-01"),
    sentAt: new Date("2026-06-02T08:30:00Z"),
    acceptedAt: new Date("2026-06-05T15:00:00Z"),
    notes: "Accepted commercial scope for project mobilisation.",
    lines: [
      { productId: products[1].id, lineType: QuoteLineType.product, description: "Aruba core switch estate", quantity: 6, unitCost: 1640, unitSell: 2132 },
      { productId: products[0].id, lineType: QuoteLineType.product, description: "Guest AP replacement", quantity: 58, unitCost: 210, unitSell: 273 },
      { productId: products[2].id, lineType: QuoteLineType.labour, description: "Project management", quantity: 7, unitCost: 325, unitSell: 650 },
      { productId: products[3].id, lineType: QuoteLineType.labour, description: "Engineering delivery", quantity: 14, unitCost: 280, unitSell: 560 }
    ]
  });
  const quoteThree = await ensureQuote(prisma, {
    quoteNumber: "Q-2026-9003",
    title: "Hilton Manchester Airport Structured Cabling Remedials",
    projectName: "Hilton Cabling Remedials",
    highLevelScope: "Rectify legacy cabling, replace riser links and complete floor-by-floor rack rationalisation.",
    accountId: accountHilton.id,
    opportunityId: opportunities[2].id,
    contactId: contacts[1].id,
    ownerId: salesOne.id,
    status: QuoteStatus.accepted,
    preparedDate: dateOnly("2026-05-28"),
    sentAt: new Date("2026-05-30T12:00:00Z"),
    acceptedAt: new Date("2026-06-08T10:15:00Z"),
    notes: "Accepted remedial cabling scope.",
    lines: [
      { productId: products[5].id, lineType: QuoteLineType.product, description: "CAT6 cable boxes", quantity: 24, unitCost: 88, unitSell: 114.4 },
      { productId: products[4].id, lineType: QuoteLineType.labour, description: "Installation crew days", quantity: 12, unitCost: 240, unitSell: 480 },
      { productId: products[2].id, lineType: QuoteLineType.labour, description: "PM governance", quantity: 4, unitCost: 325, unitSell: 650 }
    ]
  });

  await ensurePresalesRequest(prisma, {
    requestNumber: "PS-2026-9001",
    accountId: accountHilton.id,
    opportunityId: opportunities[3].id,
    quoteId: quoteOne.id,
    requestedById: salesOne.id,
    assignedToId: presalesEngineer.id,
    requestCategory: PresalesRequestCategory.iptv,
    requestType: PresalesRequestType.iptv_design,
    priority: PresalesPriority.high,
    commercialPriority: PresalesCommercialPriority.high,
    status: PresalesRequestStatus.in_progress,
    slaStatus: PresalesSlaStatus.due_soon,
    ragStatus: PresalesRagStatus.amber,
    description: "Review IPTV upgrade scope, GUI, casting and channel plan.",
    requestedDeliveryDate: dateOnly("2026-06-28"),
    internalDeadline: dateOnly("2026-06-24"),
    estimatedHours: 18,
    quoteValueSnapshot: 38250,
    quoteVersionSnapshot: 1,
    deliverables: [
      { title: "RFP documentation reviewed and questions raised", deliverableType: "survey_report", status: PresalesDeliverableStatus.complete },
      { title: "Network Diagram Created", deliverableType: "network_diagram", status: PresalesDeliverableStatus.in_progress },
      { title: "Port Matrix Created", deliverableType: "port_matrix", status: PresalesDeliverableStatus.open },
      { title: "Scope for GUI, casting, apps and channels agreed", deliverableType: "gui_scope", status: PresalesDeliverableStatus.open },
      { title: "Bill of Materials Created", deliverableType: "bill_of_materials", status: PresalesDeliverableStatus.open }
    ]
  });
  await ensurePresalesRequest(prisma, {
    requestNumber: "PS-2026-9002",
    accountId: accountMarriott.id,
    opportunityId: opportunities[1].id,
    quoteId: quoteTwo.id,
    requestedById: salesOne.id,
    assignedToId: presalesEngineer.id,
    requestCategory: PresalesRequestCategory.consultancy,
    requestType: PresalesRequestType.design_review,
    priority: PresalesPriority.normal,
    commercialPriority: PresalesCommercialPriority.strategic,
    status: PresalesRequestStatus.complete,
    slaStatus: PresalesSlaStatus.complete,
    ragStatus: PresalesRagStatus.green,
    description: "Complete Marriott GPNS handover documentation and deliverable archive.",
    requestedDeliveryDate: dateOnly("2026-06-03"),
    internalDeadline: dateOnly("2026-06-03"),
    estimatedHours: 22,
    actualHours: 20,
    quoteValueSnapshot: 124800,
    quoteVersionSnapshot: 1,
    readyForProject: true,
    completedAt: new Date("2026-06-04T16:00:00Z"),
    deliverables: [
      { title: "RFP documentation reviewed and questions raised", deliverableType: "rfp_review", status: PresalesDeliverableStatus.complete },
      { title: "Network Diagram Created", deliverableType: "network_diagram", status: PresalesDeliverableStatus.complete },
      { title: "Port Matrix Created", deliverableType: "port_matrix", status: PresalesDeliverableStatus.complete },
      { title: "Bill of Materials Created", deliverableType: "bill_of_materials", status: PresalesDeliverableStatus.complete }
    ]
  });

  const projectOne = await createProjectFromQuote(adminContext, quoteTwo.id, {
    projectManagerId: projectManager.id,
    projectType: OpportunityType.marriott_gpns,
    status: ProjectStatus.initiation,
    startDate: dateOnly("2026-06-16"),
    targetEndDate: dateOnly("2026-08-28")
  });
  const projectTwo = await createProjectFromQuote(adminContext, quoteThree.id, {
    projectManagerId: projectManager.id,
    projectType: OpportunityType.structured_cabling_racks,
    status: ProjectStatus.initiation,
    startDate: dateOnly("2026-06-23"),
    targetEndDate: dateOnly("2026-09-04")
  });

  await prisma.project.updateMany({
    where: { id: { in: [projectOne.id, projectTwo.id] } },
    data: { updatedById: admin.id }
  });

  await ensureDefaultProjectBillingSchedule(adminContext, projectOne.id);
  await ensureDefaultProjectBillingSchedule(adminContext, projectTwo.id);

  await ensureProjectResourceAssignment(prisma, adminContext, projectOne.id, projectManager.id, "project_manager", "2026-06-16", "2026-08-28");
  await ensureProjectResourceAssignment(prisma, adminContext, projectTwo.id, projectManager.id, "project_manager", "2026-06-23", "2026-09-04");

  const resources = await Promise.all([
    ensureResource(prisma, { displayName: projectManager.displayName, resourceType: ResourceType.internal_user, userId: projectManager.id, roleType: "Project Manager", email: projectManager.email, standardDayCost: 325, standardDaySell: 650 }),
    ensureResource(prisma, { displayName: "Skyline Cabling Ltd", resourceType: ResourceType.subcontractor, companyName: "Skyline Cabling Ltd", roleType: "Structured Cabling Team", email: "dispatch@skyline-cabling.test", standardDayCost: 360, standardDaySell: 720, agentName: "Ella Forbes", agentEmail: "ella.forbes@skyline-cabling.test" }),
    ensureResource(prisma, { displayName: "NorthWest WiFi Surveys", resourceType: ResourceType.subcontractor, companyName: "NorthWest WiFi Surveys", roleType: "Survey Engineer", email: "ops@northwestwifi.test", standardDayCost: 300, standardDaySell: 600, agentName: "Chris Patel", agentEmail: "chris.patel@northwestwifi.test" }),
    ensureResource(prisma, { displayName: businessOps.displayName, resourceType: ResourceType.internal_user, userId: businessOps.id, roleType: "Business Operations", email: businessOps.email, standardDayCost: 250, standardDaySell: 0 }),
    ensureResource(prisma, { displayName: presalesEngineer.displayName, resourceType: ResourceType.internal_user, userId: presalesEngineer.id, roleType: "Pre-Sales Engineer", email: presalesEngineer.email, standardDayCost: 285, standardDaySell: 0 })
  ]);

  await ensureResourceBooking(prisma, {
    resourceId: resources[0].id,
    projectId: projectOne.id,
    accountId: accountMarriott.id,
    opportunityId: opportunities[1].id,
    bookingType: ResourceBookingType.project,
    title: "Marriott GPNS kickoff and governance",
    description: "Project manager governance block for mobilisation and client cadence.",
    location: "Manchester",
    startDate: dateOnly("2026-06-16"),
    endDate: dateOnly("2026-06-20"),
    workingDays: 5,
    costRate: 325,
    sellRate: 650,
    status: ResourceBookingStatus.confirmed
  });
  await ensureResourceBooking(prisma, {
    resourceId: resources[1].id,
    projectId: projectTwo.id,
    accountId: accountHilton.id,
    opportunityId: opportunities[2].id,
    bookingType: ResourceBookingType.project,
    title: "Hilton cabling deployment survey",
    description: "Subcontractor survey and staging window for Hilton cabling works.",
    location: "Manchester Airport",
    startDate: dateOnly("2026-06-23"),
    endDate: dateOnly("2026-06-24"),
    workingDays: 2,
    costRate: 360,
    sellRate: 720,
    status: ResourceBookingStatus.confirmed
  });
  await ensureResourceBooking(prisma, {
    resourceId: resources[2].id,
    accountId: accountHilton.id,
    opportunityId: opportunities[3].id,
    bookingType: ResourceBookingType.survey,
    title: "Hilton IPTV survey",
    description: "Non-project survey visit for IPTV pre-sales scope validation.",
    location: "Manchester Airport",
    startDate: dateOnly("2026-06-24"),
    endDate: dateOnly("2026-06-24"),
    workingDays: 1,
    costRate: 300,
    sellRate: 600,
    status: ResourceBookingStatus.draft,
    conflictStatus: BookingConflictStatus.warning
  });

  await ensureLeaveRequest(prisma, {
    userId: projectManager.id,
    leaveType: LeaveType.annual_leave,
    status: LeaveStatus.approved,
    startDate: dateOnly("2026-07-20"),
    endDate: dateOnly("2026-07-24"),
    workingDays: 5,
    approverId: admin.id,
    approvedAt: new Date("2026-06-14T09:00:00Z"),
    reason: "Summer leave"
  });
  await ensureLeaveRequest(prisma, {
    userId: presalesEngineer.id,
    leaveType: LeaveType.training,
    status: LeaveStatus.submitted,
    startDate: dateOnly("2026-07-06"),
    endDate: dateOnly("2026-07-07"),
    workingDays: 2,
    approverId: admin.id,
    reason: "Vendor accreditation training"
  });

  const receiptOne = await ensureDocument(prisma, {
    entityType: "ExpenseClaim",
    entityId: "production-test-receipts",
    fileName: "receipt-hotel-stay.pdf",
    fileType: "application/pdf"
  });
  const receiptTwo = await ensureDocument(prisma, {
    entityType: "ExpenseClaim",
    entityId: "production-test-receipts",
    fileName: "receipt-mileage.png",
    fileType: "image/png"
  });

  const expenseOne = await ensureExpenseClaim(prisma, {
    claimNumber: "EXP-2026-9001",
    userId: projectManager.id,
    projectId: projectTwo.id,
    accountId: accountHilton.id,
    status: ExpenseClaimStatus.approved,
    submittedAt: new Date("2026-06-12T09:30:00Z"),
    approvedById: admin.id,
    approvedAt: new Date("2026-06-13T08:45:00Z"),
    currency: "GBP",
    notes: "Travel and accommodation for Hilton cabling works.",
    lines: [
      { expenseDate: dateOnly("2026-06-12"), category: ExpenseCategory.accommodation, description: "Hotel stay near airport site", amount: 145, vatAmount: 24.17, receiptDocumentId: receiptOne.id },
      { expenseDate: dateOnly("2026-06-12"), category: ExpenseCategory.mileage, description: "Mileage to Hilton Manchester Airport site", amount: 0, mileageMiles: 18, mileageRate: 0.45, mileageFrom: "Central Manchester", mileageTo: "Manchester Airport", receiptDocumentId: receiptTwo.id }
    ]
  });
  await ensureExpenseClaim(prisma, {
    claimNumber: "EXP-2026-9002",
    userId: presalesEngineer.id,
    projectId: projectOne.id,
    accountId: accountMarriott.id,
    status: ExpenseClaimStatus.paid,
    submittedAt: new Date("2026-06-11T16:20:00Z"),
    approvedById: admin.id,
    approvedAt: new Date("2026-06-12T08:00:00Z"),
    paidById: admin.id,
    paidAt: new Date("2026-06-13T11:30:00Z"),
    currency: "GBP",
    notes: "Pre-installation engineering subsistence.",
    lines: [
      { expenseDate: dateOnly("2026-06-11"), category: ExpenseCategory.meals, description: "Site meals", amount: 28.5, vatAmount: 0 },
      { expenseDate: dateOnly("2026-06-11"), category: ExpenseCategory.parking, description: "Hotel car park", amount: 18, vatAmount: 0 }
    ]
  });

  const supplierOne = await ensureSupplier(prisma, { name: "Ubiquiti Distribution UK", contactName: "Laura Kemp", email: "orders@ubnt-dist.test", phone: "+44 161 555 4101", address: "Manchester Trade Park", paymentTerms: "30 days" });
  const supplierTwo = await ensureSupplier(prisma, { name: "Network Cabling Supplies Ltd", contactName: "Simon Hart", email: "sales@network-cabling.test", phone: "+44 121 555 4102", address: "Birmingham Logistics Hub", paymentTerms: "30 days" });

  const poOne = await ensurePurchaseOrder(prisma, {
    poNumber: "PO-2026-9001",
    supplierId: supplierOne.id,
    projectId: projectOne.id,
    quoteId: quoteTwo.id,
    status: PurchaseOrderStatus.ordered,
    requestedById: businessOps.id,
    approvedById: admin.id,
    approvedAt: new Date("2026-06-10T10:00:00Z"),
    orderDate: dateOnly("2026-06-10"),
    expectedDeliveryDate: dateOnly("2026-06-24"),
    currency: "GBP",
    notes: "Switching and wireless hardware for Marriott GPNS rollout.",
    lines: [
      { productId: products[1].id, sku: "SW-48P-POE", manufacturer: "Aruba", description: "48 port PoE core switch", quantity: 6, unitCost: 1640 },
      { productId: products[0].id, sku: "AP-U7-PRO", manufacturer: "Ubiquiti", description: "WiFi 7 access points", quantity: 20, unitCost: 210 }
    ]
  });
  const poTwo = await ensurePurchaseOrder(prisma, {
    poNumber: "PO-2026-9002",
    supplierId: supplierTwo.id,
    projectId: projectTwo.id,
    quoteId: quoteThree.id,
    status: PurchaseOrderStatus.received,
    requestedById: businessOps.id,
    approvedById: admin.id,
    approvedAt: new Date("2026-06-09T09:00:00Z"),
    orderDate: dateOnly("2026-06-09"),
    expectedDeliveryDate: dateOnly("2026-06-19"),
    receivedDate: dateOnly("2026-06-19"),
    currency: "GBP",
    notes: "Structured cabling consumables.",
    lines: [
      { productId: products[5].id, sku: "CAB-CAT6-305", manufacturer: "Excel", description: "CAT6 cable boxes", quantity: 24, unitCost: 88 }
    ]
  });

  const supplierInvoiceDoc = await ensureDocument(prisma, {
    entityType: "PurchaseOrder",
    entityId: poTwo.id,
    fileName: "supplier-invoice-po-2026-9002.pdf",
    fileType: "application/pdf"
  });
  await ensureSupplierInvoice(prisma, poOne.id, {
    invoiceNumber: "SUP-INV-9001",
    invoiceDate: dateOnly("2026-06-12"),
    dueDate: dateOnly("2026-07-12"),
    amount: 14040,
    status: SupplierInvoiceStatus.received
  });
  await ensureSupplierInvoice(prisma, poTwo.id, {
    invoiceNumber: "SUP-INV-9002",
    invoiceDate: dateOnly("2026-06-19"),
    dueDate: dateOnly("2026-07-19"),
    amount: 2112,
    status: SupplierInvoiceStatus.approved,
    documentId: supplierInvoiceDoc.id
  });

  const invoiceOne = await ensureCustomerInvoice(prisma, {
    invoiceNumber: "INV-2026-9001",
    accountId: accountMarriott.id,
    projectId: projectOne.id,
    quoteId: quoteTwo.id,
    status: "partially_paid",
    issueDate: dateOnly("2026-06-15"),
    dueDate: dateOnly("2026-06-30"),
    amount: 93600,
    vatAmount: 18720,
    paidAmount: 56160,
    notes: "75% upfront stage invoice"
  });
  const invoiceTwo = await ensureCustomerInvoice(prisma, {
    invoiceNumber: "INV-2026-9002",
    accountId: accountHilton.id,
    projectId: projectTwo.id,
    quoteId: quoteThree.id,
    status: "issued",
    issueDate: dateOnly("2026-06-20"),
    dueDate: dateOnly("2026-07-04"),
    amount: 44062,
    vatAmount: 8812.4,
    paidAmount: 0,
    notes: "Initial mobilisation invoice"
  });
  await ensureCustomerPayment(prisma, invoiceOne.id, { paymentDate: dateOnly("2026-06-20"), amount: 56160, method: "bank_transfer", reference: "MAR-DEP-56160" });

  const poTwoLine = await prisma.purchaseOrderLine.findFirstOrThrow({ where: { purchaseOrderId: poTwo.id }, orderBy: { createdAt: "asc" } });
  const poOneLines = await prisma.purchaseOrderLine.findMany({ where: { purchaseOrderId: poOne.id }, orderBy: { createdAt: "asc" } });
  const assets = await Promise.all([
    ensureAsset(prisma, { assetNumber: "AST-2026-9001", projectId: projectOne.id, accountId: accountMarriott.id, purchaseOrderLineId: poOneLines[0]?.id, productId: products[1].id, sku: "SW-48P-POE", manufacturer: "Aruba", model: "CX 6100", serialNumber: "ARUBA-9001", description: "Core switch MDF", status: "received", location: "MDF" }),
    ensureAsset(prisma, { assetNumber: "AST-2026-9002", projectId: projectOne.id, accountId: accountMarriott.id, purchaseOrderLineId: poOneLines[1]?.id, productId: products[0].id, sku: "AP-U7-PRO", manufacturer: "Ubiquiti", model: "U7 Pro", serialNumber: "UBNT-9002", macAddress: "00:11:22:33:44:55", description: "Lobby AP", status: "staged", location: "Stores" }),
    ensureAsset(prisma, { assetNumber: "AST-2026-9003", projectId: projectTwo.id, accountId: accountHilton.id, purchaseOrderLineId: poTwoLine.id, productId: products[5].id, sku: "CAB-CAT6-305", manufacturer: "Excel", model: "CAT6 UTP", description: "Cable stock for riser works", status: "received", location: "Site storage" })
  ]);

  const queueSupport = await ensureHelpdeskQueue(prisma, "Projects Support", "Project and post-install support queue");
  await ensureHelpdeskQueue(prisma, "NOC", "Operational monitoring and incidents");

  await ensureHelpdeskTicket(prisma, {
    ticketNumber: "HD-2026-9001",
    accountId: accountMarriott.id,
    contactId: marriottPrimary.id,
    projectId: projectOne.id,
    assetId: assets[0].id,
    raisedByUserId: salesOne.id,
    raisedByName: "Sophie Grant",
    raisedByEmail: marriottPrimary.email ?? undefined,
    title: "MDF switch delivery timing confirmation",
    description: "Customer requesting delivery confirmation for MDF switch estate.",
    ticketType: HelpdeskTicketType.service_request,
    category: HelpdeskTicketCategory.hardware,
    priority: HelpdeskPriority.normal,
    impact: HelpdeskImpact.medium,
    urgency: HelpdeskUrgency.medium,
    status: HelpdeskTicketStatus.assigned,
    slaStatus: HelpdeskSlaStatus.on_track,
    assignedToId: projectManager.id,
    queueId: queueSupport.id,
    source: HelpdeskTicketSource.project_handover
  });
  await ensureHelpdeskTicket(prisma, {
    ticketNumber: "HD-2026-9002",
    accountId: accountHilton.id,
    contactId: hiltonPrimary.id,
    projectId: projectTwo.id,
    assetId: assets[2].id,
    raisedByUserId: salesOne.id,
    raisedByName: "Rebecca Moore",
    raisedByEmail: hiltonPrimary.email ?? undefined,
    title: "Airport cabling outage window confirmation",
    description: "Need confirmation of guest impact and outage window before cabling remedial works.",
    ticketType: HelpdeskTicketType.change_request,
    category: HelpdeskTicketCategory.network,
    priority: HelpdeskPriority.high,
    impact: HelpdeskImpact.high,
    urgency: HelpdeskUrgency.high,
    status: HelpdeskTicketStatus.in_progress,
    slaStatus: HelpdeskSlaStatus.due_soon,
    assignedToId: projectManager.id,
    queueId: queueSupport.id,
    source: HelpdeskTicketSource.manual
  });

  await ensureNotification(prisma, salesOne.id, "Quote awaiting customer response", "Q-2026-9001 is still in Sent status and due for follow-up.", "/quotes/" + quoteOne.id);
  await ensureNotification(prisma, projectManager.id, "Project mobilisation ready", `${projectOne.projectNumber} has an accepted quote, resources and billing schedule ready for review.`, `/projects/${projectOne.id}`);
  await ensureNotification(prisma, businessOps.id, "Purchase order delivery due", `${poOne.poNumber} is due for delivery this week.`, `/procurement/purchase-orders/${poOne.id}`);
  await ensureNotification(prisma, presalesEngineer.id, "Approved expenses awaiting payment", `${expenseOne.claimNumber} is approved and ready for finance review.`, `/expenses/${expenseOne.id}`);
  await ensureNotification(prisma, projectManager.id, "Assigned helpdesk ticket", "HD-2026-9002 is assigned to you and linked to Hilton cabling works.", "/helpdesk/tickets");

  await syncActiveUsersToResources();
  const resourceCount = await prisma.resource.count({ where: { deletedAt: null } });

  return {
    users: 5,
    accounts: 2,
    contacts: 4,
    opportunities: opportunities.length,
    quotes: 3,
    projects: 2,
    presalesRequests: 2,
    resources: resourceCount,
    resourceBookings: 2,
    leaveRequests: 2,
    expenseClaims: 2,
    suppliers: 2,
    purchaseOrders: 2,
    customerInvoices: 2,
    assets: 3,
    helpdeskTickets: 2,
    notifications: 4
  };
}

export function buildProductionTestSeedDefinition() {
  return structuredClone(productionTestSeedDefinition);
}

export async function cleanupProductionTestData(prisma: PrismaClient): Promise<CleanupSummary> {
  const definition = productionTestCleanupDefinition;
  const testEmailFragments = [".test", "@hilton-manchester.test", "@marriott-mcr.test", "@native-bham.test"];
  const users = await prisma.user.findMany({
    where: { email: { in: [...definition.userEmails] } },
    select: { id: true }
  });
  const userIds = users.map((user) => user.id);

  const contacts = await prisma.contact.findMany({
    where: {
      OR: testEmailFragments.map((fragment) => ({ email: { contains: fragment } }))
    },
    select: { id: true, accountId: true }
  });
  const contactIds = contacts.map((contact) => contact.id);
  const contactAccountIds = [...new Set(contacts.map((contact) => contact.accountId))];

  const opportunities = await prisma.opportunity.findMany({
    where: {
      OR: [
        { opportunityName: { in: [...definition.opportunityNames] } },
        ...(contactAccountIds.length ? [{ accountId: { in: contactAccountIds } }] : [])
      ]
    },
    select: { id: true, accountId: true }
  });
  const opportunityIds = opportunities.map((opportunity) => opportunity.id);

  const quotes = await prisma.quote.findMany({
    where: { quoteNumber: { in: [...definition.quoteNumbers] } },
    select: { id: true, accountId: true }
  });
  const quoteIds = quotes.map((quote) => quote.id);

  const helpdeskTickets = await prisma.helpdeskTicket.findMany({
    where: { ticketNumber: { in: [...definition.helpdeskTicketNumbers] } },
    select: { id: true, accountId: true, projectId: true, assetId: true }
  });
  const ticketIds = helpdeskTickets.map((ticket) => ticket.id);

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { quoteId: { in: quoteIds } },
        { id: { in: helpdeskTickets.map((ticket) => ticket.projectId).filter(Boolean) as string[] } }
      ]
    },
    select: { id: true, accountId: true }
  });
  const projectIds = [...new Set(projects.map((project) => project.id))];
  const projectAccountIds = [...new Set(projects.map((project) => project.accountId))];
  const quoteAccountIds = [...new Set(quotes.map((quote) => quote.accountId))];
  const opportunityAccountIds = [...new Set(opportunities.map((opportunity) => opportunity.accountId))];
  const ticketAccountIds = [...new Set(helpdeskTickets.map((ticket) => ticket.accountId).filter(Boolean) as string[])];
  const accountIds = [...new Set([
    ...contactAccountIds,
    ...quoteAccountIds,
    ...opportunityAccountIds,
    ...projectAccountIds,
    ...ticketAccountIds
  ])];

  const resources = await prisma.resource.findMany({
    where: {
      OR: [
        {
          AND: [
            { displayName: { in: [...definition.resourceNames] } },
            {
              OR: [
                { email: { contains: ".test" } },
                { companyName: { in: ["Skyline Cabling Ltd", "NorthWest WiFi Surveys"] } }
              ]
            }
          ]
        },
        ...(userIds.length ? [{ userId: { in: userIds } }] : [])
      ]
    },
    select: { id: true }
  });
  const resourceIds = resources.map((resource) => resource.id);

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { poNumber: { in: [...definition.poNumbers] } },
    select: { id: true }
  });
  const purchaseOrderIds = purchaseOrders.map((order) => order.id);

  const customerInvoices = await prisma.customerInvoice.findMany({
    where: { invoiceNumber: { in: [...definition.invoiceNumbers] } },
    select: { id: true }
  });
  const invoiceIds = customerInvoices.map((invoice) => invoice.id);

  const expenseClaims = await prisma.expenseClaim.findMany({
    where: { claimNumber: { in: [...definition.expenseClaimNumbers] } },
    select: { id: true }
  });
  const expenseClaimIds = expenseClaims.map((claim) => claim.id);

  const deletedProjectAssignments = await prisma.projectResourceAssignment.deleteMany({
    where: {
      OR: [
        ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
        ...(resourceIds.length ? [{ resourceId: { in: resourceIds } }] : []),
        ...(userIds.length ? [{ userId: { in: userIds } }] : [])
      ]
    }
  });
  const deletedBookings = await prisma.resourceBooking.deleteMany({
    where: {
      OR: [
        { title: { in: [...definition.resourceBookingTitles] } },
        ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
        ...(resourceIds.length ? [{ resourceId: { in: resourceIds } }] : []),
        ...(ticketIds.length ? [{ helpdeskTicketId: { in: ticketIds } }] : [])
      ]
    }
  });

  await prisma.helpdeskTicketComment.deleteMany({ where: ticketIds.length ? { ticketId: { in: ticketIds } } : { id: { in: [] } } });
  await prisma.leaveRequest.deleteMany({ where: userIds.length ? { userId: { in: userIds } } : { id: { in: [] } } });
  await prisma.expenseLine.deleteMany({ where: expenseClaimIds.length ? { claimId: { in: expenseClaimIds } } : { id: { in: [] } } });
  await prisma.expenseClaim.deleteMany({ where: expenseClaimIds.length ? { id: { in: expenseClaimIds } } : { id: { in: [] } } });
  await prisma.customerPayment.deleteMany({ where: invoiceIds.length ? { invoiceId: { in: invoiceIds } } : { id: { in: [] } } });
  await prisma.customerInvoice.deleteMany({ where: invoiceIds.length ? { id: { in: invoiceIds } } : { id: { in: [] } } });
  await prisma.supplierInvoice.deleteMany({ where: purchaseOrderIds.length ? { purchaseOrderId: { in: purchaseOrderIds } } : { id: { in: [] } } });
  await prisma.goodsReceipt.deleteMany({ where: purchaseOrderIds.length ? { purchaseOrderId: { in: purchaseOrderIds } } : { id: { in: [] } } });
  await prisma.purchaseOrderLine.deleteMany({ where: purchaseOrderIds.length ? { purchaseOrderId: { in: purchaseOrderIds } } : { id: { in: [] } } });
  await prisma.purchaseOrder.deleteMany({ where: purchaseOrderIds.length ? { id: { in: purchaseOrderIds } } : { id: { in: [] } } });
  await prisma.asset.deleteMany({ where: { assetNumber: { in: [...definition.assetNumbers] } } });
  await prisma.helpdeskTicket.deleteMany({ where: ticketIds.length ? { id: { in: ticketIds } } : { id: { in: [] } } });
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      OR: [
        { title: { in: [...definition.notificationTitles] } },
        { body: { contains: "Q-2026-9001" } },
        { body: { contains: "EXP-2026-9001" } },
        { body: { contains: "PO-2026-9001" } },
        { body: { contains: "HD-2026-9002" } }
      ]
    }
  });
  await prisma.presalesDeliverable.deleteMany({ where: { presalesRequest: { requestNumber: { in: [...definition.requestNumbers] } } } });
  await prisma.presalesRequest.deleteMany({ where: { requestNumber: { in: [...definition.requestNumbers] } } });
  await prisma.project.deleteMany({ where: projectIds.length ? { id: { in: projectIds } } : { id: { in: [] } } });
  await prisma.quoteLine.deleteMany({ where: { quoteVersion: { quote: { quoteNumber: { in: [...definition.quoteNumbers] } } } } });
  await prisma.quoteVersion.deleteMany({ where: { quote: { quoteNumber: { in: [...definition.quoteNumbers] } } } });
  await prisma.quote.deleteMany({ where: { quoteNumber: { in: [...definition.quoteNumbers] } } });
  await prisma.opportunityStageHistory.deleteMany({ where: opportunityIds.length ? { opportunityId: { in: opportunityIds } } : { id: { in: [] } } });
  await prisma.opportunity.deleteMany({ where: opportunityIds.length ? { id: { in: opportunityIds } } : { id: { in: [] } } });
  await prisma.contact.deleteMany({ where: contactIds.length ? { id: { in: contactIds } } : { id: { in: [] } } });
  const deletedAccounts = await prisma.account.deleteMany({ where: accountIds.length ? { id: { in: accountIds } } : { id: { in: [] } } });
  await prisma.supplier.updateMany({
    where: {
      OR: [
        { email: { contains: ".test" } },
        { name: { in: ["Ubiquiti Distribution UK", "Network Cabling Supplies Ltd"] } }
      ]
    },
    data: {
      active: false
    }
  });
  const deletedResources = await prisma.resource.deleteMany({
    where: {
      OR: [
        {
          AND: [
            { displayName: { in: [...definition.resourceNames] } },
            {
              OR: [
                { email: { contains: ".test" } },
                { companyName: { in: ["Skyline Cabling Ltd", "NorthWest WiFi Surveys"] } }
              ]
            }
          ]
        },
        ...(userIds.length ? [{ userId: { in: userIds } }] : [])
      ]
    }
  });
  const deletedUsers = await prisma.user.deleteMany({ where: userIds.length ? { id: { in: userIds } } : { id: { in: [] } } });
  return {
    usersRemoved: deletedUsers.count,
    accountsRemoved: deletedAccounts.count,
    projectsRemoved: projectIds.length,
    resourcesRemoved: deletedResources.count,
    bookingsRemoved: deletedBookings.count,
    projectAssignmentsRemoved: deletedProjectAssignments.count,
    notificationsRemoved: deletedNotifications.count
  };
}

async function ensureUser(prisma: PrismaClient, input: { email: string; displayName: string; roleName: string; permissionLevel: PermissionLevel; password: string }) {
  const role = await prisma.role.findFirst({ where: { name: input.roleName } });
  if (!role) throw new Error(`Role ${input.roleName} must exist before production test seed runs.`);
  const passwordHash = await hashPassword(input.password);
  const existing = await prisma.user.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName: input.displayName,
        roleId: role.id,
        permissionLevel: input.permissionLevel,
        passwordHash,
        isActive: true,
        deletedAt: null,
        deactivatedAt: null,
        mustChangePassword: false
      }
    });
  }
  return prisma.user.create({
    data: {
      displayName: input.displayName,
      email: input.email,
      passwordHash,
      roleId: role.id,
      permissionLevel: input.permissionLevel,
      isActive: true,
      mustChangePassword: false,
      userType: "internal"
    }
  });
}

async function ensureAccount(prisma: PrismaClient, input: Prisma.AccountUncheckedCreateInput) {
  const existing = await prisma.account.findFirst({ where: { name: input.name, deletedAt: null } });
  if (existing) {
    return prisma.account.update({ where: { id: existing.id }, data: input });
  }
  return prisma.account.create({ data: input });
}

async function ensureContact(prisma: PrismaClient, accountId: string, input: { firstName: string; lastName: string; email: string; jobTitle?: string; phone?: string; isPrimary?: boolean }) {
  const existing = await prisma.contact.findFirst({ where: { accountId, email: { equals: input.email, mode: "insensitive" }, deletedAt: null } });
  const data = {
    accountId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    jobTitle: input.jobTitle,
    phone: input.phone,
    isPrimary: input.isPrimary ?? false,
    status: ContactStatus.active
  };
  if (existing) return prisma.contact.update({ where: { id: existing.id }, data });
  return prisma.contact.create({ data });
}

async function ensureOpportunity(prisma: PrismaClient, input: {
  accountId: string;
  primaryContactId: string;
  ownerId: string;
  opportunityName: string;
  opportunityType: OpportunityType;
  stage: OpportunityStage;
  status: OpportunityStatus;
  value: number;
  probabilityPercent: number;
  expectedCloseDate?: Date;
  nextActionDate?: Date;
  lastActivityAt?: Date;
  wonDate?: Date;
  source: OpportunitySource;
  notes?: string;
}) {
  const weightedValue = Number((input.value * (input.probabilityPercent / 100)).toFixed(2));
  const existing = await prisma.opportunity.findFirst({ where: { opportunityName: input.opportunityName, accountId: input.accountId, deletedAt: null } });
  const data = { ...input, weightedValue };
  if (existing) {
    const updated = await prisma.opportunity.update({ where: { id: existing.id }, data });
    await ensureOpportunityStageHistory(prisma, updated.id, input.stage, input.ownerId);
    return updated;
  }
  const created = await prisma.opportunity.create({ data });
  await ensureOpportunityStageHistory(prisma, created.id, input.stage, input.ownerId);
  return created;
}

async function ensureOpportunityStageHistory(prisma: PrismaClient, opportunityId: string, stage: OpportunityStage, changedById: string) {
  const existing = await prisma.opportunityStageHistory.findFirst({ where: { opportunityId, toStage: stage } });
  if (existing) return existing;
  return prisma.opportunityStageHistory.create({ data: { opportunityId, fromStage: null, toStage: stage, changedById } });
}

async function ensureProduct(prisma: PrismaClient, input: { sku: string; manufacturer: string; supplier: string; category: string; description: string; itemType: "product" | "labour" | "service"; costPrice: number; defaultSellPrice: number }) {
  const marginPercent = input.costPrice > 0 ? Number((((input.defaultSellPrice - input.costPrice) / input.defaultSellPrice) * 100).toFixed(2)) : 0;
  return prisma.product.upsert({
    where: { supplier_sku: { supplier: input.supplier, sku: input.sku } },
    update: { ...input, marginPercent, isActive: true },
    create: { ...input, marginPercent, isActive: true }
  });
}

async function ensureQuote(prisma: PrismaClient, input: {
  quoteNumber: string;
  title: string;
  projectName: string;
  highLevelScope: string;
  accountId: string;
  opportunityId: string;
  contactId: string;
  ownerId: string;
  status: QuoteStatus;
  preparedDate: Date;
  sentAt?: Date;
  acceptedAt?: Date;
  notes?: string;
  lines: Array<{ productId?: string | null; lineType: QuoteLineType; description: string; quantity: number; unitCost: number; unitSell: number }>;
}) {
  const totals = calculateQuoteTotals(input.lines);
  const existing = await prisma.quote.findFirst({ where: { quoteNumber: input.quoteNumber } });
  const baseData = {
    quoteNumber: input.quoteNumber,
    title: input.title,
    projectName: input.projectName,
    customerName: null,
    hotelName: null,
    highLevelScope: input.highLevelScope,
    preparedDate: input.preparedDate,
    accountId: input.accountId,
    opportunityId: input.opportunityId,
    contactId: input.contactId,
    ownerId: input.ownerId,
    status: input.status,
    currentVersionNumber: 1,
    costTotal: totals.costTotal,
    sellTotal: totals.sellTotal,
    marginTotal: totals.marginTotal,
    marginPercent: totals.marginPercent,
    notes: input.notes,
    sentAt: input.sentAt,
    acceptedAt: input.acceptedAt
  };

  const quote = existing
    ? await prisma.quote.update({ where: { id: existing.id }, data: baseData })
    : await prisma.quote.create({ data: baseData });

  const version = await prisma.quoteVersion.upsert({
    where: { quoteId_versionNumber: { quoteId: quote.id, versionNumber: 1 } },
    update: {
      status: input.status,
      isLocked: input.status === QuoteStatus.accepted,
      costTotal: totals.costTotal,
      sellTotal: totals.sellTotal,
      marginTotal: totals.marginTotal,
      marginPercent: totals.marginPercent,
      notes: input.notes,
      terms: quoteTerms
    },
    create: {
      quoteId: quote.id,
      versionNumber: 1,
      status: input.status,
      isLocked: input.status === QuoteStatus.accepted,
      costTotal: totals.costTotal,
      sellTotal: totals.sellTotal,
      marginTotal: totals.marginTotal,
      marginPercent: totals.marginPercent,
      notes: input.notes,
      terms: quoteTerms
    }
  });

  await prisma.quoteLine.deleteMany({ where: { quoteVersionId: version.id } });
  await prisma.quoteLine.createMany({
    data: input.lines.map((line, index) => {
      const totalsForLine = calculateQuoteLine(line.quantity, line.unitCost, line.unitSell);
      return {
        quoteVersionId: version.id,
        productId: line.productId ?? null,
        lineType: line.lineType,
        description: line.description,
        quantity: line.quantity,
        unitCost: line.unitCost,
        unitSell: line.unitSell,
        costTotal: totalsForLine.costTotal,
        sellTotal: totalsForLine.sellTotal,
        marginTotal: totalsForLine.marginTotal,
        marginPercent: totalsForLine.marginPercent,
        sortOrder: index + 1
      };
    })
  });

  return quote;
}

async function ensurePresalesRequest(prisma: PrismaClient, input: {
  requestNumber: string;
  accountId: string;
  opportunityId?: string;
  quoteId?: string;
  requestedById: string;
  assignedToId?: string;
  requestCategory: PresalesRequestCategory;
  requestType: PresalesRequestType;
  priority: PresalesPriority;
  commercialPriority: PresalesCommercialPriority;
  status: PresalesRequestStatus;
  slaStatus: PresalesSlaStatus;
  ragStatus: PresalesRagStatus;
  description: string;
  requestedDeliveryDate?: Date;
  internalDeadline: Date;
  estimatedHours?: number;
  actualHours?: number;
  quoteValueSnapshot?: number;
  quoteVersionSnapshot?: number;
  completedAt?: Date;
  readyForProject?: boolean;
  deliverables: Array<{ title: string; deliverableType: string; status: PresalesDeliverableStatus }>;
}) {
  const { deliverables, ...requestInput } = input;
  const existing = await prisma.presalesRequest.findFirst({ where: { requestNumber: input.requestNumber } });
  const sharePointFolderUrl = `PreSales/2026/${input.requestNumber} ${slugify(input.description).slice(0, 42)}`;
  const request = existing
    ? await prisma.presalesRequest.update({
        where: { id: existing.id },
        data: {
          ...requestInput,
          assignedToId: input.assignedToId ?? null,
          opportunityId: input.opportunityId ?? null,
          quoteId: input.quoteId ?? null,
          sharePointFolderUrl
        }
      })
    : await prisma.presalesRequest.create({
        data: {
          ...requestInput,
          assignedToId: input.assignedToId ?? null,
          opportunityId: input.opportunityId ?? null,
          quoteId: input.quoteId ?? null,
          sharePointFolderUrl
        }
      });
  await prisma.presalesDeliverable.deleteMany({ where: { presalesRequestId: request.id } });
  await prisma.presalesDeliverable.createMany({
    data: deliverables.map((deliverable) => ({
      presalesRequestId: request.id,
      deliverableType: deliverable.deliverableType as never,
      title: deliverable.title,
      status: deliverable.status,
      assignedToId: input.assignedToId ?? null,
      completedAt: deliverable.status === PresalesDeliverableStatus.complete ? input.completedAt ?? new Date() : null
    }))
  });
  return request;
}

async function ensureProjectResourceAssignment(prisma: PrismaClient, context: SeedContext, projectId: string, userId: string, role: "project_manager" | "project_engineer" | "field_engineer", startDate: string, endDate: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true } });
  const resource = await ensureResource(prisma, {
    userId,
    displayName: user?.displayName ?? `Resource ${userId}`,
    email: user?.email ?? undefined,
    resourceType: ResourceType.internal_user
  });
  const existing = await prisma.projectResourceAssignment.findFirst({ where: { projectId, resourceId: resource.id, role, deletedAt: null } });
  if (existing) return existing;
  return createProjectResource(context, projectId, {
    resourceId: resource.id,
    role,
    startDate: dateOnly(startDate),
    endDate: dateOnly(endDate),
    usedDays: 0,
    conflictOverride: false
  });
}

async function ensureResource(prisma: PrismaClient, input: {
  displayName: string;
  resourceType: ResourceType;
  userId?: string;
  companyName?: string;
  roleType?: string;
  email?: string;
  standardDayCost?: number;
  standardDaySell?: number;
  agentName?: string;
  agentEmail?: string;
}) {
  const existing = await prisma.resource.findFirst({
    where: {
      OR: [
        { displayName: input.displayName, deletedAt: null },
        ...(input.userId ? [{ userId: input.userId }] : [])
      ]
    }
  });
  const data = {
    displayName: input.displayName,
    resourceType: input.resourceType,
    userId: input.userId ?? null,
    companyName: input.companyName ?? null,
    roleType: input.roleType ?? null,
    email: input.email ?? null,
    standardDayCost: input.standardDayCost ?? 0,
    standardDaySell: input.standardDaySell ?? 0,
    halfDayCost: 0,
    halfDaySell: 0,
    hourlyCost: 0,
    hourlySell: 0,
    agentName: input.agentName ?? null,
    agentEmail: input.agentEmail ?? null,
    skillTags: [],
    active: true,
    deletedAt: null
  };
  if (existing) return prisma.resource.update({ where: { id: existing.id }, data });
  return prisma.resource.create({ data });
}

async function ensureResourceBooking(prisma: PrismaClient, input: {
  resourceId: string;
  projectId?: string;
  accountId?: string;
  opportunityId?: string;
  bookingType: ResourceBookingType;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  costRate: number;
  sellRate: number;
  status: ResourceBookingStatus;
  conflictStatus?: BookingConflictStatus;
}) {
  const existing = await prisma.resourceBooking.findFirst({ where: { title: input.title, resourceId: input.resourceId, deletedAt: null } });
  const data = {
    resourceId: input.resourceId,
    projectId: input.projectId ?? null,
    accountId: input.accountId ?? null,
    opportunityId: input.opportunityId ?? null,
    bookingType: input.bookingType,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    workingDays: input.workingDays,
    costRate: input.costRate,
    sellRate: input.sellRate,
    costTotal: Number((input.costRate * input.workingDays).toFixed(2)),
    sellTotal: Number((input.sellRate * input.workingDays).toFixed(2)),
    status: input.status,
    conflictStatus: input.conflictStatus ?? BookingConflictStatus.clear,
    chargeable: true
  };
  if (existing) return prisma.resourceBooking.update({ where: { id: existing.id }, data });
  return prisma.resourceBooking.create({ data });
}

async function ensureLeaveRequest(prisma: PrismaClient, input: {
  userId: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  approverId?: string;
  approvedAt?: Date;
  reason?: string;
}) {
  const existing = await prisma.leaveRequest.findFirst({ where: { userId: input.userId, startDate: input.startDate, endDate: input.endDate, deletedAt: null } });
  const data = { ...input, approverId: input.approverId ?? null, approvedAt: input.approvedAt ?? null };
  if (existing) return prisma.leaveRequest.update({ where: { id: existing.id }, data });
  return prisma.leaveRequest.create({ data });
}

async function ensureDocument(prisma: PrismaClient, input: { entityType: string; entityId: string; fileName: string; fileType: string }) {
  const existing = await prisma.document.findFirst({ where: { entityType: input.entityType, entityId: input.entityId, fileName: input.fileName, deletedAt: null } });
  const data = {
    storageProvider: DocumentStorageProvider.other,
    externalId: null,
    webUrl: null,
    folderPath: `ConnectedOS/${input.entityType}/${input.entityId}`,
    storagePath: `/storage/production-test/${input.fileName}`,
    versionLabel: "1.0",
    fileName: input.fileName,
    fileType: input.fileType,
    sizeBytes: 1024,
    entityType: input.entityType,
    entityId: input.entityId
  };
  if (existing) return prisma.document.update({ where: { id: existing.id }, data });
  return prisma.document.create({ data });
}

async function ensureExpenseClaim(prisma: PrismaClient, input: {
  claimNumber: string;
  userId: string;
  projectId?: string;
  accountId?: string;
  status: ExpenseClaimStatus;
  submittedAt?: Date;
  approvedById?: string;
  approvedAt?: Date;
  paidById?: string;
  paidAt?: Date;
  currency: string;
  notes?: string;
  lines: Array<{ expenseDate: Date; category: ExpenseCategory; description: string; amount: number; vatAmount?: number; mileageMiles?: number; mileageRate?: number; mileageFrom?: string; mileageTo?: string; receiptDocumentId?: string }>;
}) {
  const totalAmount = input.lines.reduce((sum, line) => sum + (line.category === ExpenseCategory.mileage ? Number(((line.mileageMiles ?? 0) * (line.mileageRate ?? 0.45)).toFixed(2)) : line.amount) + Number(line.vatAmount ?? 0), 0);
  const existing = await prisma.expenseClaim.findFirst({ where: { claimNumber: input.claimNumber } });
  const claim = existing
    ? await prisma.expenseClaim.update({
        where: { id: existing.id },
        data: {
          userId: input.userId,
          projectId: input.projectId ?? null,
          accountId: input.accountId ?? null,
          status: input.status,
          submittedAt: input.submittedAt ?? null,
          approvedById: input.approvedById ?? null,
          approvedAt: input.approvedAt ?? null,
          paidById: input.paidById ?? null,
          paidAt: input.paidAt ?? null,
          currency: input.currency,
          notes: input.notes ?? null,
          totalAmount
        }
      })
    : await prisma.expenseClaim.create({
        data: {
          claimNumber: input.claimNumber,
          userId: input.userId,
          projectId: input.projectId ?? null,
          accountId: input.accountId ?? null,
          status: input.status,
          submittedAt: input.submittedAt ?? null,
          approvedById: input.approvedById ?? null,
          approvedAt: input.approvedAt ?? null,
          paidById: input.paidById ?? null,
          paidAt: input.paidAt ?? null,
          currency: input.currency,
          notes: input.notes ?? null,
          totalAmount
        }
      });
  await prisma.expenseLine.deleteMany({ where: { claimId: claim.id } });
  await prisma.expenseLine.createMany({
    data: input.lines.map((line) => ({
      claimId: claim.id,
      expenseDate: line.expenseDate,
      category: line.category,
      description: line.description,
      amount: line.category === ExpenseCategory.mileage ? Number(((line.mileageMiles ?? 0) * (line.mileageRate ?? 0.45)).toFixed(2)) : line.amount,
      vatAmount: line.vatAmount ?? null,
      currency: input.currency,
      receiptDocumentId: line.receiptDocumentId ?? null,
      mileageMiles: line.mileageMiles ?? null,
      mileageRate: line.mileageRate ?? null,
      mileageFrom: line.mileageFrom ?? null,
      mileageTo: line.mileageTo ?? null,
      projectId: input.projectId ?? null
    }))
  });
  return claim;
}

async function ensureSupplier(prisma: PrismaClient, input: { name: string; contactName?: string; email?: string; phone?: string; address?: string; paymentTerms?: string }) {
  const existing = await prisma.supplier.findFirst({ where: { name: input.name, deletedAt: null } });
  const data = {
    name: input.name,
    contactName: input.contactName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    paymentTerms: input.paymentTerms ?? null,
    defaultCurrency: "GBP",
    active: true
  };
  if (existing) return prisma.supplier.update({ where: { id: existing.id }, data });
  return prisma.supplier.create({ data });
}

async function ensurePurchaseOrder(prisma: PrismaClient, input: {
  poNumber: string;
  supplierId: string;
  projectId?: string;
  quoteId?: string;
  status: PurchaseOrderStatus;
  requestedById?: string;
  approvedById?: string;
  approvedAt?: Date;
  orderDate?: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  currency: string;
  notes?: string;
  lines: Array<{ productId?: string; sku?: string; manufacturer?: string; description: string; quantity: number; unitCost: number }>;
}) {
  const subtotal = input.lines.reduce((sum, line) => sum + (line.quantity * line.unitCost), 0);
  const existing = await prisma.purchaseOrder.findFirst({ where: { poNumber: input.poNumber } });
  const po = existing
    ? await prisma.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          supplierId: input.supplierId,
          projectId: input.projectId ?? null,
          quoteId: input.quoteId ?? null,
          status: input.status,
          requestedById: input.requestedById ?? null,
          approvedById: input.approvedById ?? null,
          approvedAt: input.approvedAt ?? null,
          orderDate: input.orderDate ?? null,
          expectedDeliveryDate: input.expectedDeliveryDate ?? null,
          receivedDate: input.receivedDate ?? null,
          subtotal,
          vatAmount: 0,
          totalAmount: subtotal,
          currency: input.currency,
          notes: input.notes ?? null
        }
      })
    : await prisma.purchaseOrder.create({
        data: {
          poNumber: input.poNumber,
          supplierId: input.supplierId,
          projectId: input.projectId ?? null,
          quoteId: input.quoteId ?? null,
          status: input.status,
          requestedById: input.requestedById ?? null,
          approvedById: input.approvedById ?? null,
          approvedAt: input.approvedAt ?? null,
          orderDate: input.orderDate ?? null,
          expectedDeliveryDate: input.expectedDeliveryDate ?? null,
          receivedDate: input.receivedDate ?? null,
          subtotal,
          vatAmount: 0,
          totalAmount: subtotal,
          currency: input.currency,
          notes: input.notes ?? null
        }
      });
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: po.id } });
  await prisma.purchaseOrderLine.createMany({
    data: input.lines.map((line) => ({
      purchaseOrderId: po.id,
      productId: line.productId ?? null,
      sku: line.sku ?? null,
      manufacturer: line.manufacturer ?? null,
      description: line.description,
      quantity: line.quantity,
      unitCost: line.unitCost,
      totalCost: Number((line.quantity * line.unitCost).toFixed(2)),
      receivedQuantity: input.status === PurchaseOrderStatus.received ? line.quantity : 0
    }))
  });
  return po;
}

async function ensureSupplierInvoice(prisma: PrismaClient, purchaseOrderId: string, input: { invoiceNumber: string; invoiceDate: Date; dueDate?: Date; amount: number; status: SupplierInvoiceStatus; documentId?: string }) {
  const existing = await prisma.supplierInvoice.findFirst({ where: { purchaseOrderId, invoiceNumber: input.invoiceNumber, deletedAt: null } });
  const data = {
    purchaseOrderId,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate ?? null,
    amount: input.amount,
    status: input.status,
    documentId: input.documentId ?? null
  };
  if (existing) return prisma.supplierInvoice.update({ where: { id: existing.id }, data });
  return prisma.supplierInvoice.create({ data });
}

async function ensureCustomerInvoice(prisma: PrismaClient, input: { invoiceNumber: string; accountId: string; projectId?: string; quoteId?: string; status: "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled"; issueDate: Date; dueDate: Date; amount: number; vatAmount: number; paidAmount: number; notes?: string }) {
  const totalAmount = input.amount + input.vatAmount;
  const outstandingAmount = totalAmount - input.paidAmount;
  const existing = await prisma.customerInvoice.findFirst({ where: { invoiceNumber: input.invoiceNumber } });
  const data = {
    invoiceNumber: input.invoiceNumber,
    accountId: input.accountId,
    projectId: input.projectId ?? null,
    quoteId: input.quoteId ?? null,
    status: input.status as never,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    amount: input.amount,
    vatAmount: input.vatAmount,
    totalAmount,
    paidAmount: input.paidAmount,
    outstandingAmount,
    currency: "GBP",
    notes: input.notes ?? null
  };
  if (existing) return prisma.customerInvoice.update({ where: { id: existing.id }, data });
  return prisma.customerInvoice.create({ data });
}

async function ensureCustomerPayment(prisma: PrismaClient, invoiceId: string, input: { paymentDate: Date; amount: number; method?: string; reference?: string }) {
  const existing = await prisma.customerPayment.findFirst({ where: { invoiceId, paymentDate: input.paymentDate, amount: input.amount } });
  if (existing) return existing;
  return prisma.customerPayment.create({ data: { invoiceId, paymentDate: input.paymentDate, amount: input.amount, method: input.method ?? null, reference: input.reference ?? null } });
}

async function ensureAsset(prisma: PrismaClient, input: {
  assetNumber: string;
  projectId?: string;
  accountId?: string;
  purchaseOrderLineId?: string;
  productId?: string;
  sku?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  macAddress?: string;
  description: string;
  status: "required" | "ordered" | "received" | "staged" | "installed" | "handed_over" | "returned" | "disposed" | "cancelled";
  location?: string;
}) {
  const existing = await prisma.asset.findFirst({ where: { assetNumber: input.assetNumber } });
  const data = {
    projectId: input.projectId ?? null,
    accountId: input.accountId ?? null,
    purchaseOrderLineId: input.purchaseOrderLineId ?? null,
    productId: input.productId ?? null,
    sku: input.sku ?? null,
    manufacturer: input.manufacturer ?? null,
    model: input.model ?? null,
    serialNumber: input.serialNumber ?? null,
    macAddress: input.macAddress ?? null,
    description: input.description,
    status: input.status as never,
    location: input.location ?? null
  };
  if (existing) return prisma.asset.update({ where: { id: existing.id }, data });
  return prisma.asset.create({ data: { assetNumber: input.assetNumber, ...data } });
}

async function ensureHelpdeskQueue(prisma: PrismaClient, name: string, description: string) {
  const existing = await prisma.helpdeskQueue.findFirst({ where: { name } });
  if (existing) return prisma.helpdeskQueue.update({ where: { id: existing.id }, data: { description, active: true } });
  return prisma.helpdeskQueue.create({ data: { name, description, active: true } });
}

async function ensureHelpdeskTicket(prisma: PrismaClient, input: {
  ticketNumber: string;
  accountId?: string;
  contactId?: string;
  projectId?: string;
  assetId?: string;
  raisedByUserId?: string;
  raisedByName?: string;
  raisedByEmail?: string;
  title: string;
  description: string;
  ticketType: HelpdeskTicketType;
  category: HelpdeskTicketCategory;
  priority: HelpdeskPriority;
  impact: HelpdeskImpact;
  urgency: HelpdeskUrgency;
  status: HelpdeskTicketStatus;
  slaStatus: HelpdeskSlaStatus;
  assignedToId?: string;
  queueId?: string;
  source: HelpdeskTicketSource;
}) {
  const existing = await prisma.helpdeskTicket.findFirst({ where: { ticketNumber: input.ticketNumber } });
  const data = {
    accountId: input.accountId ?? null,
    contactId: input.contactId ?? null,
    projectId: input.projectId ?? null,
    assetId: input.assetId ?? null,
    raisedByUserId: input.raisedByUserId ?? null,
    raisedByName: input.raisedByName ?? null,
    raisedByEmail: input.raisedByEmail ?? null,
    title: input.title,
    description: input.description,
    ticketType: input.ticketType,
    category: input.category,
    priority: input.priority,
    impact: input.impact,
    urgency: input.urgency,
    status: input.status,
    slaStatus: input.slaStatus,
    assignedToId: input.assignedToId ?? null,
    queueId: input.queueId ?? null,
    source: input.source
  };
  if (existing) return prisma.helpdeskTicket.update({ where: { id: existing.id }, data });
  return prisma.helpdeskTicket.create({ data: { ticketNumber: input.ticketNumber, ...data } });
}

async function ensureNotification(prisma: PrismaClient, userId: string, title: string, body: string, href: string) {
  const existing = await prisma.notification.findFirst({ where: { userId, title, body } });
  if (existing) return existing;
  return prisma.notification.create({ data: { userId, title, body, metadata: { href } } });
}

function calculateQuoteLine(quantity: number, unitCost: number, unitSell: number) {
  const costTotal = Number((quantity * unitCost).toFixed(2));
  const sellTotal = Number((quantity * unitSell).toFixed(2));
  const marginTotal = Number((sellTotal - costTotal).toFixed(2));
  const marginPercent = sellTotal > 0 ? Number(((marginTotal / sellTotal) * 100).toFixed(2)) : 0;
  return { costTotal, sellTotal, marginTotal, marginPercent };
}

function calculateQuoteTotals(lines: Array<{ quantity: number; unitCost: number; unitSell: number }>) {
  const totals = lines.reduce((sum, line) => {
    const lineTotals = calculateQuoteLine(line.quantity, line.unitCost, line.unitSell);
    return {
      costTotal: sum.costTotal + lineTotals.costTotal,
      sellTotal: sum.sellTotal + lineTotals.sellTotal,
      marginTotal: sum.marginTotal + lineTotals.marginTotal
    };
  }, { costTotal: 0, sellTotal: 0, marginTotal: 0 });
  return {
    ...totals,
    marginPercent: totals.sellTotal > 0 ? Number(((totals.marginTotal / totals.sellTotal) * 100).toFixed(2)) : 0
  };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
