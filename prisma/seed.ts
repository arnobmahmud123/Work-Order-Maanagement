import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysFromNow(d: number) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

// ─── Data pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Elizabeth",
  "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen",
  "Christopher","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
  "Donald","Ashley","Steven","Dorothy","Paul","Kimberly","Andrew","Emily","Joshua","Donna",
  "Kenneth","Michelle","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah",
  "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
  "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna",
  "Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
  "Benjamin","Samantha","Samuel","Katherine","Gregory","Christine","Raymond","Debra","Frank","Rachel",
  "Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria","Jerry","Heather",
  "Tyler","Diane",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
  "Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper",
  "Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson",
  "Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes",
  "Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez",
];

const COMPANY_NAMES = [
  "Premier Property Services","Metro Maintenance Co.","Reliable Preservation LLC","Guardian Property Care",
  "All-State Property Solutions","Pinnacle Services Group","National Property Maintenance","Elite Preservation Services",
  "Summit Property Group","True-Blue Maintenance","ProCare Property Services","Heritage Preservation Co.",
  "Liberty Property Solutions","Continental Services Inc.","First Response Property Care","Cornerstone Maintenance",
  "Vanguard Property Services","Sterling Preservation Group","Eagle Eye Maintenance","Blue Ribbon Property Care",
  "Apex Property Solutions","Ironclad Services LLC","Precision Property Care","Total Preservation Services",
  "Beacon Property Group","Horizon Maintenance Co.","Unified Property Services","Paramount Preservation",
  "Frontline Property Care","Atlas Services Group","Phoenix Property Solutions","Keystone Maintenance",
  "Sentry Property Services","Trident Preservation","Crest Property Care","Legacy Services LLC",
  "Impact Property Solutions","Benchmark Maintenance","Evergreen Property Services","Dominion Preservation",
];

const CITIES_STATES: [string, string, string][] = [
  ["Springfield","IL","62701"],["Decatur","IL","62521"],["Champaign","IL","61820"],
  ["Peoria","IL","61602"],["Bloomington","IL","61701"],["Rockford","IL","61101"],
  ["Naperville","IL","60540"],["Joliet","IL","60431"],["Columbus","OH","43215"],
  ["Cleveland","OH","44114"],["Cincinnati","OH","45202"],["Dayton","OH","45402"],
  ["Indianapolis","IN","46204"],["Fort Wayne","IN","46802"],["Evansville","IN","47708"],
  ["Detroit","MI","48226"],["Grand Rapids","MI","49503"],["Lansing","MI","48933"],
  ["Milwaukee","WI","53202"],["Madison","WI","53703"],["Green Bay","WI","54301"],
  ["St. Louis","MO","63101"],["Kansas City","MO","64106"],["Springfield","MO","65806"],
  ["Louisville","KY","40202"],["Lexington","KY","40507"],["Nashville","TN","37203"],
  ["Memphis","TN","38103"],["Knoxville","TN","37902"],["Atlanta","GA","30303"],
  ["Savannah","GA","31401"],["Charlotte","NC","28202"],["Raleigh","NC","27601"],
  ["Birmingham","AL","35203"],["Huntsville","AL","35801"],["Jackson","MS","39201"],
  ["New Orleans","LA","70112"],["Baton Rouge","LA","70801"],["Houston","TX","77002"],
  ["Dallas","TX","75201"],["San Antonio","TX","78205"],["Austin","TX","78701"],
  ["Phoenix","AZ","85004"],["Tucson","AZ","85701"],["Denver","CO","80202"],
  ["Colorado Springs","CO","80903"],["Las Vegas","NV","89101"],["Reno","NV","89501"],
  ["Portland","OR","97201"],["Seattle","WA","98101"],["Spokane","WA","99201"],
];

const STREET_NAMES = [
  "Oak Street","Maple Avenue","Pine Road","Elm Boulevard","Cedar Lane","Birch Drive",
  "Walnut Street","Cherry Avenue","Willow Road","Ash Boulevard","Poplar Lane","Hickory Drive",
  "Magnolia Street","Cypress Avenue","Spruce Road","Sycamore Boulevard","Juniper Lane","Dogwood Drive",
  "Chestnut Street","Laurel Avenue","Holly Road","Ivy Boulevard","Fern Lane","Alder Drive",
  "Beech Street","Mulberry Avenue","Pecan Road","Laurel Boulevard","Clover Lane","Sage Drive",
  "Primrose Street","Rosewood Avenue","Timber Road","Forest Boulevard","Meadow Lane","Valley Drive",
  "Ridge Street","Summit Avenue","Highland Road","Lake Boulevard","River Lane","Creek Drive",
];

function randomAddress(): { address: string; city: string; state: string; zipCode: string } {
  const num = randInt(100, 9999);
  const street = pick(STREET_NAMES);
  const [city, state, zip] = pick(CITIES_STATES);
  return { address: `${num} ${street}`, city, state, zipCode: zip };
}

const SERVICE_TYPES = ["GRASS_CUT","DEBRIS_REMOVAL","WINTERIZATION","BOARD_UP","INSPECTION","MOLD_REMEDIATION","OTHER"] as const;
const STATUSES = ["NEW","PENDING","ASSIGNED","IN_PROGRESS","FIELD_COMPLETE","QC_REVIEW","PENDING_REVIEW","REVISIONS_NEEDED","OFFICE_COMPLETE","CLOSED","CANCELLED","ASSETS"] as const;
const INVOICE_STATUSES = ["DRAFT","SENT","PAID","OVERDUE"] as const;
const TICKET_PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"] as const;
const TICKET_STATUSES = ["OPEN","IN_PROGRESS","WAITING","RESOLVED","CLOSED"] as const;

function makeTasks(serviceType: string): any[] {
  const taskTemplates: Record<string, string[]> = {
    GRASS_CUT: ["Mow front yard","Mow back yard","Edge along driveway and walkways","Trim bushes","Blow off debris from walkways","Take before/after photos"],
    DEBRIS_REMOVAL: ["Assess debris volume","Remove all debris from interior","Clear exterior debris","Haul to disposal site","Sweep and clean area","Take completion photos"],
    WINTERIZATION: ["Drain water heater","Blow out water lines","Add antifreeze to toilets/sinks","Shut off water main","Insulate exposed pipes","Document with photos"],
    BOARD_UP: ["Measure all openings","Cut plywood to size","Secure boards on windows","Board up doorways if needed","Secure garage entry","Take photos of all boarded openings"],
    INSPECTION: ["Walk exterior perimeter","Check roof condition","Inspect all windows and doors","Check foundation","Test HVAC system","Document all findings with photos","Complete inspection report"],
    MOLD_REMEDIATION: ["Assess mold extent","Set up containment barriers","Remove affected materials","Treat with antimicrobial","Install dehumidifiers","Clearance testing","Document with photos"],
    OTHER: ["Assess property condition","Complete assigned tasks","Document work performed","Take photos","Submit completion report"],
  };
  const templates = taskTemplates[serviceType] || taskTemplates.OTHER;
  return templates.map((title, i) => ({
    id: String(i + 1),
    title,
    completed: Math.random() > 0.5,
  }));
}

function makeServiceDescription(serviceType: string, addr: string): string {
  const descriptions: Record<string, string[]> = {
    GRASS_CUT: [
      `Overgrown lawn at ${addr} needs immediate attention. Grass over 12 inches.`,
      `Routine grass cut requested for ${addr}. Include edging and blowing.`,
      `Vacant property at ${addr} - grass and weeds overgrown. Full service needed.`,
    ],
    DEBRIS_REMOVAL: [
      `Large amount of debris in garage and backyard at ${addr}. Previous tenant left furniture and trash.`,
      `Debris removal needed at ${addr}. Construction materials and household items left behind.`,
      `Full property cleanout at ${addr}. Interior and exterior debris removal required.`,
    ],
    WINTERIZATION: [
      `Full winterization needed at ${addr} before freeze season. All utilities on.`,
      `Winterization service requested for ${addr}. Water is currently on.`,
      `Emergency winterization at ${addr}. Forecast shows freezing temps in 48 hours.`,
    ],
    BOARD_UP: [
      `Broken windows on east side of ${addr} need boarding. Front door lock damaged.`,
      `Board up all ground floor windows at ${addr}. Multiple broken panes.`,
      `Secure property at ${addr} - vandalism damage to windows and doors.`,
    ],
    INSPECTION: [
      `Initial property inspection needed at ${addr}. Full interior and exterior.`,
      `Re-inspection requested for ${addr}. Previous issues need verification.`,
      `Routine inspection at ${addr}. Check condition and report any issues.`,
    ],
    MOLD_REMEDIATION: [
      `Mold found in basement at ${addr}. Remediation needed ASAP.`,
      `Water damage and mold growth at ${addr}. Full remediation required.`,
      `Black mold discovered in bathroom of ${addr}. Professional remediation needed.`,
    ],
    OTHER: [
      `Special service request at ${addr}. See notes for details.`,
      `Miscellaneous maintenance needed at ${addr}. Multiple items.`,
      `Custom service request for ${addr}. Coordinate with client for details.`,
    ],
  };
  return pick(descriptions[serviceType] || descriptions.OTHER);
}

// ─── Main seed ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");
  const hashedPassword = await bcrypt.hash("password123", 12);

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating users...");

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@proppreserve.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@proppreserve.com",
      hashedPassword,
      role: "ADMIN",
      company: "PropPreserve Inc.",
      phone: "(555) 100-0001",
      image: `https://i.pravatar.cc/150?u=admin@proppreserve.com`,
    },
  });

  // Contractors (100)
  const contractors: any[] = [];
  for (let i = 1; i <= 100; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `contractor${i}@proppreserve.com`;
    const c = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "CONTRACTOR",
        company: pick(COMPANY_NAMES),
        phone: `(555) ${String(200 + Math.floor(i / 10)).padStart(3, "0")}-${String(i % 100).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    contractors.push(c);
  }

  // Processors (5)
  const processors: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `processor${i}@proppreserve.com`;
    const p = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "PROCESSOR",
        company: "PropPreserve Inc.",
        phone: `(555) 300-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    processors.push(p);
  }

  // Coordinators (5)
  const coordinators: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `coordinator${i}@proppreserve.com`;
    const co = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "COORDINATOR",
        company: "PropPreserve Inc.",
        phone: `(555) 400-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    coordinators.push(co);
  }

  // Accountants (3)
  const accountants: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `accountant${i}@proppreserve.com`;
    const a = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "ACCOUNTANT",
        company: "PropPreserve Inc.",
        phone: `(555) 500-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    accountants.push(a);
  }

  // Client Managers (2)
  const clientManagers: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `clientmanager${i}@proppreserve.com`;
    const cm = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "CLIENT_MANAGER",
        company: "PropPreserve Inc.",
        phone: `(555) 600-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    clientManagers.push(cm);
  }

  // Processor In-Charges (2)
  const processorIncharges: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `processorincharge${i}@proppreserve.com`;
    const pi = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "PROCESSOR_INCHARGE",
        company: "PropPreserve Inc.",
        phone: `(555) 700-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    processorIncharges.push(pi);
  }

  // In-Charge Client Managers (2)
  const inchargeCMs: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `inchcm${i}@proppreserve.com`;
    const icm = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "INCHARGE_CLIENT_MANAGER",
        company: "PropPreserve Inc.",
        phone: `(555) 800-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    inchargeCMs.push(icm);
  }

  // In-Charge Coordinators (2)
  const inchargeCoords: any[] = [];
  for (let i = 1; i <= 2; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `inchargecoord${i}@proppreserve.com`;
    const ic = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "INCHARGE_COORDINATOR",
        company: "PropPreserve Inc.",
        phone: `(555) 900-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    inchargeCoords.push(ic);
  }

  // Clients (5)
  const clients: any[] = [];
  const clientCompanies = ["Davis Real Estate Group","Summit Holdings LLC","Metro Asset Management","National REO Services","First Capital Properties"];
  for (let i = 1; i <= 5; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `client${i}@proppreserve.com`;
    const cl = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email,
        hashedPassword,
        role: "CLIENT",
        company: clientCompanies[i - 1],
        phone: `(555) 110-${String(i).padStart(4, "0")}`,
        image: `https://i.pravatar.cc/150?u=${email}`,
      },
    });
    clients.push(cl);
  }

  const allUsers = [admin, ...contractors, ...processors, ...coordinators, ...accountants, ...clientManagers, ...processorIncharges, ...inchargeCMs, ...inchargeCoords, ...clients];
  console.log(`  ✅ ${allUsers.length} users created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTIES & WORK ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating properties and work orders...");

  const properties: any[] = [];
  const workOrders: any[] = [];

  for (let i = 0; i < 200; i++) {
    const loc = randomAddress();
    const prop = await prisma.property.create({
      data: {
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zipCode,
      },
    });
    properties.push(prop);

    const serviceType = pick([...SERVICE_TYPES]);
    const status = pick([...STATUSES]);
    const priority = pick([0, 1, 2]);
    const dueDays = randInt(-30, 45);
    const client = pick(clients);
    const coordinator = pick(coordinators);
    const processor = pick(processors);
    const contractor = pick(contractors);

    const title = `${serviceType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())} - ${loc.address}`;

    const woData: any = {
      title,
      description: makeServiceDescription(serviceType, `${loc.address}, ${loc.city}, ${loc.state}`),
      address: loc.address,
      city: loc.city,
      state: loc.state,
      zipCode: loc.zipCode,
      serviceType,
      status,
      priority,
      dueDate: daysFromNow(dueDays),
      contractorId: contractor.id,
      coordinatorId: coordinator.id,
      processorId: processor.id,
      createdById: pick([admin.id, client.id, coordinator.id]),
      propertyId: prop.id,
      tasks: makeTasks(serviceType),
    };

    // Add lock/gate codes on some
    if (Math.random() > 0.6) {
      woData.lockCode = String(randInt(1000, 9999));
    }
    if (Math.random() > 0.8) {
      woData.gateCode = String(randInt(100, 999));
    }
    if (Math.random() > 0.85) {
      woData.specialInstructions = pick([
        "Property has aggressive dog - call before arriving",
        "Access through back gate only",
        "Neighbor has spare key - contact Mrs. Johnson at (555) 888-1234",
        "Do NOT enter garage - structural concerns",
        "Property is occupied - tenant is expecting you",
        "Use side entrance. Front door is boarded shut.",
        "HOA requires work to be completed by 5pm",
        "Flood damage in basement - wear protective gear",
      ]);
    }

    // Mark some as completed
    if (["CLOSED", "OFFICE_COMPLETE"].includes(status)) {
      woData.completedAt = daysFromNow(dueDays - randInt(1, 5));
    }

    const wo = await prisma.workOrder.create({ data: woData });
    workOrders.push(wo);
  }

  console.log(`  ✅ ${properties.length} properties and ${workOrders.length} work orders created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNELS & CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating channels and conversations...");

  // Public channels
  const channelDefs = [
    { name: "general", type: "GENERAL", description: "Company-wide announcements and discussion" },
    { name: "work-orders", type: "WORK_ORDERS", description: "Work order coordination and updates" },
    { name: "field-operations", type: "CUSTOM", description: "Field team coordination and scheduling" },
    { name: "client-updates", type: "CUSTOM", description: "Client-facing updates and communication" },
    { name: "dispatch", type: "CUSTOM", description: "Scheduling and dispatch coordination" },
    { name: "urgent", type: "CUSTOM", description: "Urgent and critical issues requiring immediate attention" },
  ];

  const staffUsers = [admin, ...coordinators, ...processors, ...accountants, ...clientManagers, ...processorIncharges, ...inchargeCMs, ...inchargeCoords];

  const createdChannels: any[] = [];
  for (const def of channelDefs) {
    const channel = await prisma.channel.create({
      data: {
        name: def.name,
        description: def.description,
        type: def.type as any,
        createdById: admin.id,
        members: {
          create: staffUsers.map((u) => ({
            userId: u.id,
            role: u.id === admin.id ? "ADMIN" : "MEMBER",
          })),
        },
      },
    });
    createdChannels.push(channel);
  }

  // DM channels
  const dmPairs: [any, any][] = [
    [coordinators[0], processors[0]],
    [coordinators[1], contractors[0]],
    [admin, coordinators[0]],
    [processors[0], processors[1]],
    [clientManagers[0], clients[0]],
    [inchargeCoords[0], coordinators[2]],
  ];

  const dmChannels: any[] = [];
  for (const [u1, u2] of dmPairs) {
    const ch = await prisma.channel.create({
      data: {
        name: `${u1.name} & ${u2.name}`,
        type: "DIRECT_MESSAGE",
        createdById: u1.id,
        members: {
          create: [
            { userId: u1.id, role: "ADMIN" },
            { userId: u2.id, role: "MEMBER" },
          ],
        },
      },
    });
    dmChannels.push(ch);
  }

  // Messages for #general
  const generalMessages = [
    { author: admin, content: "👋 Good morning team! Welcome to the new PropPreserve communication hub. Use this channel for company-wide announcements.", daysAgo: 14 },
    { author: coordinators[0], content: "Thanks for setting this up! Much better than email chains.", daysAgo: 14 },
    { author: processors[0], content: "Agreed. Looking forward to better coordination here.", daysAgo: 13 },
    { author: admin, content: "📢 Reminder: Q2 performance reviews are due next Friday. Please submit your self-assessments.", daysAgo: 10 },
    { author: coordinators[1], content: "Will do. Quick question - are we rolling out the new photo requirements this month?", daysAgo: 10 },
    { author: admin, content: "Yes, starting Monday all work orders require before, during, and after photos. I'll send detailed guidelines.", daysAgo: 9 },
    { author: contractors[0], content: "Good to know. I'll make sure my team is ready.", daysAgo: 9 },
    { author: processors[1], content: "Can we get a training session on the new QC checklist?", daysAgo: 7 },
    { author: admin, content: "Scheduled for Wednesday at 2pm EST. Calendar invites going out today.", daysAgo: 7 },
    { author: coordinators[2], content: "Great, thanks! Also wanted to flag that we're seeing a lot of grass cut requests in the Midwest region.", daysAgo: 5 },
    { author: clientManagers[0], content: "Confirmed - we onboarded 3 new clients last week. Expect 30+ new work orders by Friday.", daysAgo: 5 },
    { author: admin, content: "Excellent growth! @coordinator1 and @coordinator2, please plan capacity accordingly.", daysAgo: 5 },
  ];

  // Messages for #work-orders
  const workOrderMessages = [
    { author: coordinators[0], content: `New batch of 15 work orders just dropped for the Chicago area. Need contractors assigned ASAP.`, daysAgo: 6 },
    { author: contractors[0], content: "I can take 5 of those - anything in the south suburbs?", daysAgo: 6 },
    { author: coordinators[0], content: "Yes, I've assigned you WOs in Joliet, Naperville, and Bolingbrook. Check your queue.", daysAgo: 6 },
    { author: processors[0], content: `QC flag: WO at ${workOrders[10]?.address || "456 Maple Ave"} - photos are too dark to verify completion. Need retakes.`, daysAgo: 4 },
    { author: coordinators[1], content: "@contractor3 can you swing by and retake those photos today?", daysAgo: 4 },
    { author: contractors[2], content: "On it. Should be there by 2pm.", daysAgo: 4 },
    { author: processors[1], content: "We have 3 WOs stuck in REVISIONS_NEEDED for over a week. These need to be resolved.", daysAgo: 3 },
    { author: coordinators[0], content: "I'll follow up with the contractors today. Which ones?", daysAgo: 3 },
    { author: processors[1], content: "The winterization jobs in Ohio. Contractors haven't submitted corrected documentation.", daysAgo: 3 },
    { author: admin, content: "📊 Weekly stats: 47 WOs completed, 23 in progress, 12 pending. On-time rate: 89%. Let's push for 95% next week!", daysAgo: 2 },
  ];

  // Messages for #field-operations
  const fieldMessages = [
    { author: coordinators[0], content: "⚠️ Weather alert: Heavy rain expected in the Southeast region Thursday-Saturday. Reschedule outdoor work accordingly.", daysAgo: 8 },
    { author: contractors[5], content: "Copy that. I've got 3 grass cuts scheduled in Atlanta for Thursday. Moving to Monday.", daysAgo: 8 },
    { author: coordinators[1], content: "Good call. Please update the WO due dates so we don't trigger overdue flags.", daysAgo: 8 },
    { author: contractors[0], content: "Truck broke down on I-65. Going to be late to my 10am appointment in Indianapolis.", daysAgo: 5 },
    { author: coordinators[2], content: "No worries @contractor1, I'll notify the client. Stay safe. Do you need roadside assistance?", daysAgo: 5 },
    { author: contractors[0], content: "Already called AAA. Should be back on the road in an hour.", daysAgo: 5 },
    { author: admin, content: "New equipment available: We've purchased 5 new industrial lawn mowers. Contractors can check them out from the warehouse.", daysAgo: 3 },
    { author: contractors[10], content: "Awesome! Can I reserve one for next week? Got a big commercial property.", daysAgo: 3 },
    { author: processors[0], content: "Reminder: All winterization jobs must be completed by November 15th. No exceptions.", daysAgo: 2 },
    { author: coordinators[0], content: "We still have 28 winterizations pending. Dispatch - can we get more contractors on these?", daysAgo: 2 },
  ];

  // Messages for #client-updates
  const clientMessages = [
    { author: clientManagers[0], content: "Davis Real Estate Group is requesting faster turnaround on their REO properties. Current avg is 7 days, they want 5.", daysAgo: 12 },
    { author: coordinators[0], content: "That's tight but doable for standard services. Complex jobs will still need more time.", daysAgo: 12 },
    { author: clientManagers[0], content: "Agreed. I'll set expectations with them. They're our biggest client so let's prioritize.", daysAgo: 12 },
    { author: clients[0], content: "Hi team, we have 50 new properties coming in from our Georgia portfolio. Can we discuss capacity?", daysAgo: 8 },
    { author: clientManagers[1], content: "Absolutely! I'll set up a call for tomorrow. @coordinator3 can you join?", daysAgo: 8 },
    { author: coordinators[2], content: "Yes, I'll be there. We have good coverage in Georgia right now.", daysAgo: 8 },
    { author: admin, content: "Client satisfaction scores for October: 4.6/5.0 🎉 Great job everyone! Keep it up.", daysAgo: 5 },
    { author: clientManagers[0], content: "Summit Holdings is asking about our snow removal services. Do we have contractors for that?", daysAgo: 3 },
    { author: admin, content: "Yes, we do. Let's put together a proposal. @clientmanager2 can you handle that?", daysAgo: 3 },
    { author: clientManagers[1], content: "On it. I'll have a proposal ready by Friday.", daysAgo: 3 },
  ];

  // Messages for #dispatch
  const dispatchMessages = [
    { author: coordinators[0], content: "Morning dispatch: 12 jobs scheduled today across 3 regions. All contractors confirmed.", daysAgo: 4 },
    { author: coordinators[1], content: "We have a cancellation in Dayton, OH. Any contractor available to fill the slot?", daysAgo: 4 },
    { author: contractors[15], content: "I'm in Dayton! What's the job?", daysAgo: 4 },
    { author: coordinators[1], content: "Grass cut at 789 Pine Road. Simple job, should take 30 min. Can you do it by noon?", daysAgo: 4 },
    { author: contractors[15], content: "Done. Heading there now.", daysAgo: 4 },
    { author: coordinators[2], content: "Need emergency dispatch: Board-up needed at 321 Elm Blvd. Vandalism reported. Priority 2.", daysAgo: 2 },
    { author: contractors[3], content: "I'm 20 minutes away. Sending me?", daysAgo: 2 },
    { author: coordinators[2], content: "Go! Assigned to you. Be careful and document everything.", daysAgo: 2 },
    { author: admin, content: "📊 Dispatch efficiency this week: 94% on-time. Best we've ever had! 🏆", daysAgo: 1 },
    { author: coordinators[0], content: "Tomorrow's schedule is light - only 8 jobs. Good day for training or catch-up work.", daysAgo: 1 },
  ];

  // Messages for #urgent
  const urgentMessages = [
    { author: coordinators[2], content: "🚨 URGENT: Pipe burst at 567 River Lane, Columbus OH. Water damage spreading. Need contractor NOW.", daysAgo: 6 },
    { author: contractors[8], content: "I'm in Columbus! 15 minutes out. What's the lock code?", daysAgo: 6 },
    { author: coordinators[2], content: "Lock code: 5678. Shut off the main water valve first. It's in the basement.", daysAgo: 6 },
    { author: contractors[8], content: "On site. Water is off. Assessing damage now. This is bad - basement has 3 inches of water.", daysAgo: 6 },
    { author: coordinators[2], content: "Call a water remediation company immediately. I'm notifying the client.", daysAgo: 6 },
    { author: admin, content: "Insurance claim filed for the Columbus property. All documentation is critical. Take 100+ photos.", daysAgo: 6 },
    { author: coordinators[0], content: "⚠️ ALERT: Multiple reports of squatters at vacant properties in Detroit. Do NOT enter alone.", daysAgo: 3 },
    { author: admin, content: "New policy: All Detroit-area inspections require 2-person teams until further notice.", daysAgo: 3 },
    { author: processors[0], content: "Inspector reported structural damage at 890 Summit Ave. Property flagged as unsafe. Evacuating.", daysAgo: 1 },
    { author: admin, content: "All: Structural concerns = automatic stop work. Do not re-enter until engineering clears it.", daysAgo: 1 },
  ];

  // DM messages
  const dmMessageSets = [
    // coordinators[0] <-> processors[0]
    [
      { author: coordinators[0], content: "Hey, can you prioritize the QC on those 5 grass cuts I submitted yesterday?", daysAgo: 3 },
      { author: processors[0], content: "Sure thing. I'll get them done by EOD.", daysAgo: 3 },
      { author: coordinators[0], content: "Thanks! The client is asking for updates.", daysAgo: 3 },
      { author: processors[0], content: "All 5 passed QC. Nice work from the contractors.", daysAgo: 2 },
      { author: coordinators[0], content: "Great news! I'll update the client.", daysAgo: 2 },
      { author: processors[0], content: "BTW - 2 of them had incomplete photos. I approved with a note but please remind the team.", daysAgo: 2 },
    ],
    // coordinators[1] <-> contractors[0]
    [
      { author: coordinators[1], content: "James, I have 3 urgent board-ups in your area. Can you handle them today?", daysAgo: 5 },
      { author: contractors[0], content: "I can do 2 today, 3rd would have to be tomorrow morning.", daysAgo: 5 },
      { author: coordinators[1], content: "That works. I'll assign 2 now and schedule the 3rd for tomorrow.", daysAgo: 5 },
      { author: contractors[0], content: "All done with the 2 board-ups. Photos uploaded.", daysAgo: 4 },
      { author: coordinators[1], content: "Perfect, got them. Quick and quality work as always. 👍", daysAgo: 4 },
      { author: contractors[0], content: "Thanks! Heading to the 3rd one now.", daysAgo: 3 },
      { author: coordinators[1], content: "Take your time and be thorough. The client on this one is very particular.", daysAgo: 3 },
    ],
    // admin <-> coordinators[0]
    [
      { author: admin, content: "How's the team looking for Q4?", daysAgo: 7 },
      { author: coordinators[0], content: "We're stretched thin. Need at least 10 more contractors in the Midwest.", daysAgo: 7 },
      { author: admin, content: "Let's post some listings. I'll approve the budget.", daysAgo: 7 },
      { author: coordinators[0], content: "Already drafted. Sending to you for review.", daysAgo: 6 },
      { author: admin, content: "Approved. Post them today.", daysAgo: 6 },
    ],
    // processors[0] <-> processors[1]
    [
      { author: processors[0], content: "Did you see the new QC checklist?", daysAgo: 4 },
      { author: processors[1], content: "Yeah, it's much more detailed. I like the photo requirements.", daysAgo: 4 },
      { author: processors[0], content: "Agreed. Should reduce the number of revisions needed.", daysAgo: 4 },
      { author: processors[1], content: "We should probably do a calibration session to make sure we're scoring consistently.", daysAgo: 3 },
      { author: processors[0], content: "Good idea. Let's set one up for next week.", daysAgo: 3 },
    ],
    // clientManagers[0] <-> clients[0]
    [
      { author: clientManagers[0], content: "Hi Emily, wanted to give you an update on your Georgia properties.", daysAgo: 6 },
      { author: clients[0], content: "Great, I've been waiting to hear. How are they looking?", daysAgo: 6 },
      { author: clientManagers[0], content: "15 of 20 are completed. The remaining 5 are in progress. All should be done by Friday.", daysAgo: 6 },
      { author: clients[0], content: "That's fantastic! The quality has been really good lately.", daysAgo: 5 },
      { author: clientManagers[0], content: "Thank you! We've been working hard on quality control. I'll send the full report Monday.", daysAgo: 5 },
    ],
    // inchargeCoords[0] <-> coordinators[2]
    [
      { author: inchargeCoords[0], content: "Can you pull the status report for the Southeast region?", daysAgo: 2 },
      { author: coordinators[2], content: "Sending it now. 45 active WOs, 12 completed this week, 3 overdue.", daysAgo: 2 },
      { author: inchargeCoords[0], content: "What's causing the 3 overdue?", daysAgo: 2 },
      { author: coordinators[2], content: "Contractor delays. I've already escalated and reassigned 2 of them.", daysAgo: 2 },
      { author: inchargeCoords[0], content: "Good. Let's get that overdue count to zero by end of week.", daysAgo: 2 },
    ],
  ];

  // Post messages to channels
  const channelMessageMap: [any, any[]][] = [
    [createdChannels[0], generalMessages],
    [createdChannels[1], workOrderMessages],
    [createdChannels[2], fieldMessages],
    [createdChannels[3], clientMessages],
    [createdChannels[4], dispatchMessages],
    [createdChannels[5], urgentMessages],
  ];

  const reactionEmojis = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅"];

  for (const [channel, msgs] of channelMessageMap) {
    let parentMsg: any = null;
    for (const msg of msgs) {
      const created = await prisma.chatMessage.create({
        data: {
          content: msg.content,
          channelId: channel.id,
          authorId: msg.author.id,
          createdAt: daysFromNow(-msg.daysAgo),
        },
      });

      // Add some reactions
      if (Math.random() > 0.5) {
        const reactors = pickN(staffUsers, randInt(1, 4));
        for (const reactor of reactors) {
          try {
            await prisma.messageReaction.create({
              data: {
                messageId: created.id,
                userId: reactor.id,
                emoji: pick(reactionEmojis),
              },
            });
          } catch {
            // ignore duplicate reactions
          }
        }
      }

      // Add some thread replies
      if (parentMsg && Math.random() > 0.6) {
        const replyCount = randInt(1, 3);
        for (let r = 0; r < replyCount; r++) {
          const replyAuthor = pick(staffUsers);
          const replyDays = msg.daysAgo - 0.1;
          await prisma.chatMessage.create({
            data: {
              content: pick([
                "Good point, I agree.",
                "Thanks for the update!",
                "Let me check on that.",
                "Confirmed. Moving forward with this.",
                "I'll follow up on this tomorrow.",
                "Can we discuss this more in the meeting?",
                "Great work!",
              ]),
              channelId: channel.id,
              authorId: replyAuthor.id,
              parentId: created.id,
              createdAt: daysFromNow(-replyDays),
            },
          });
        }
      }

      if (Math.random() > 0.3) parentMsg = created;
    }
  }

  // DM messages
  for (let i = 0; i < dmChannels.length && i < dmMessageSets.length; i++) {
    for (const msg of dmMessageSets[i]) {
      await prisma.chatMessage.create({
        data: {
          content: msg.content,
          channelId: dmChannels[i].id,
          authorId: msg.author.id,
          createdAt: daysFromNow(-msg.daysAgo),
        },
      });
    }
  }

  console.log(`  ✅ ${createdChannels.length + dmChannels.length} channels with messages created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating invoices...");

  const invoices: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const wo = pick(workOrders);
    const client = pick(clients);
    const status = pick([...INVOICE_STATUSES]);
    const subtotal = Math.round(randInt(150, 5000) * 100) / 100;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = subtotal + tax;

    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${String(i).padStart(6, "0")}`,
        workOrderId: wo.id,
        clientId: client.id,
        status,
        subtotal,
        tax,
        total,
        dueDate: daysFromNow(randInt(-15, 30)),
        paidAt: status === "PAID" ? daysFromNow(-randInt(1, 10)) : null,
        items: {
          create: [
            {
              description: `${wo.serviceType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())} service`,
              quantity: 1,
              unitPrice: subtotal * 0.7,
              amount: subtotal * 0.7,
            },
            {
              description: "Materials and supplies",
              quantity: 1,
              unitPrice: subtotal * 0.3,
              amount: subtotal * 0.3,
            },
          ],
        },
      },
    });
    invoices.push(inv);
  }

  console.log(`  ✅ ${invoices.length} invoices created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPORT TICKETS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating support tickets...");

  const ticketData = [
    { subject: "Unable to upload photos", description: "Upload keeps failing with 'file too large' error even though files are under 5MB.", priority: "HIGH", category: "Technical" },
    { subject: "Invoice not showing up", description: "Created an invoice 3 days ago but it's not appearing in my invoices list.", priority: "MEDIUM", category: "Billing" },
    { subject: "Work order stuck in processing", description: "WO has been in QC_REVIEW for 2 weeks with no updates.", priority: "HIGH", category: "Work Orders" },
    { subject: "Can't access mobile app", description: "App crashes on startup after the latest update. iPhone 14, iOS 17.", priority: "URGENT", category: "Technical" },
    { subject: "Payment not received", description: "Invoice INV-000003 was marked as paid 2 weeks ago but payment hasn't arrived.", priority: "HIGH", category: "Billing" },
    { subject: "Need additional contractor access", description: "New team member needs access to the system. How do I add them?", priority: "LOW", category: "Account" },
    { subject: "GPS coordinates wrong on property", description: "The GPS pin for 456 Maple Ave is pointing to the wrong location.", priority: "MEDIUM", category: "Data" },
    { subject: "Email notifications not working", description: "Haven't received any email notifications for the past week.", priority: "MEDIUM", category: "Technical" },
    { subject: "Dispute on completed work", description: "Client is disputing the quality of work on WO #45. Need mediation.", priority: "HIGH", category: "Disputes" },
    { subject: "System running slowly", description: "Dashboard takes 30+ seconds to load. Performance has degraded significantly.", priority: "URGENT", category: "Technical" },
  ];

  const tickets: any[] = [];
  for (const td of ticketData) {
    const creator = pick([...contractors, ...coordinators, ...clients]);
    const ticket = await prisma.supportTicket.create({
      data: {
        subject: td.subject,
        description: td.description,
        priority: td.priority as any,
        status: pick([...TICKET_STATUSES]) as any,
        category: td.category,
        creatorId: creator.id,
        assigneeId: admin.id,
      },
    });

    // Add comments
    const commentCount = randInt(1, 4);
    for (let c = 0; c < commentCount; c++) {
      await prisma.ticketComment.create({
        data: {
          content: pick([
            "Looking into this now.",
            "Can you provide more details?",
            "This has been escalated to the engineering team.",
            "Fix has been deployed. Please try again.",
            "We've identified the root cause. Working on a fix.",
            "Thank you for reporting this. We'll have it resolved soon.",
            "Could you try clearing your browser cache?",
            "I've reproduced the issue. Creating a bug report.",
          ]),
          ticketId: ticket.id,
          authorId: pick([admin.id, creator.id]),
        },
      });
    }

    tickets.push(ticket);
  }

  console.log(`  ✅ ${tickets.length} support tickets with comments created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating activity logs...");

  const activityActions = [
    "WORK_ORDER_CREATED","WORK_ORDER_ASSIGNED","STATUS_CHANGED","COMMENT_ADDED",
    "PHOTO_UPLOADED","INVOICE_CREATED","INVOICE_SENT","PAYMENT_RECEIVED",
    "TICKET_CREATED","TICKET_RESOLVED","USER_LOGIN","REPORT_GENERATED",
  ];

  const activityLogs: any[] = [];
  for (let i = 0; i < 60; i++) {
    const wo = pick(workOrders);
    const user = pick(allUsers);
    const action = pick(activityActions);
    const daysAgo = randInt(0, 30);

    activityLogs.push({
      action,
      details: `${action.replace(/_/g, " ").toLowerCase()} - ${wo.title}`,
      userId: user.id,
      workOrderId: Math.random() > 0.3 ? wo.id : null,
      createdAt: daysFromNow(-daysAgo),
    });
  }

  await prisma.activityLog.createMany({ data: activityLogs });
  console.log(`  ✅ ${activityLogs.length} activity logs created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // THREADS & MESSAGES (WORK ORDER CONVERSATIONS)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("  Creating threads and messages...");

  const threadParticipants = [admin, ...staffUsers, ...contractors.slice(0, 10)];
  const threads: any[] = [];

  // Create 5 general threads
  for (let i = 0; i < 5; i++) {
    const thread = await prisma.thread.create({
      data: {
        title: pick(["Team Sync", "General Logistics", "Announcements", "Safety Protocol", "Platform Feedback"]),
        isGeneral: true,
        participants: {
          create: staffUsers.slice(0, 5).map(u => ({ userId: u.id, role: "MEMBER" })),
        },
      },
    });
    threads.push(thread);
  }

  // Create threads for some work orders
  for (let i = 0; i < 15; i++) {
    const wo = workOrders[i % workOrders.length];
    const thread = await prisma.thread.create({
      data: {
        title: `Discussion for ${wo.title}`,
        isGeneral: false,
        workOrderId: wo.id,
        participants: {
          create: [
            { userId: admin.id, role: "ADMIN" },
            { userId: wo.contractorId || contractors[0].id, role: "MEMBER" },
            { userId: wo.coordinatorId || coordinators[0].id, role: "MEMBER" },
          ],
        },
      },
    });
    threads.push(thread);
  }

  // Add messages to threads
  for (const thread of threads) {
    const messageCount = randInt(2, 8);
    for (let j = 0; j < messageCount; j++) {
      const author = pick(threadParticipants);
      await prisma.message.create({
        data: {
          content: pick([
            "Has anyone checked the property front yet?",
            "I'm on my way to the site now.",
            "Please make sure to take 'After' photos for the grass cut.",
            "The client requested a bid for debris removal as well.",
            "I've uploaded the inspection report. Please review.",
            "Looking good. I'll process this work order shortly.",
            "Can we get a status update on this?",
            "Completed the field work. Photos are uploading.",
            "Wait, the lock code provided is not working.",
            "Actually, it's the secondary gate that's locked. Checking now.",
          ]),
          threadId: thread.id,
          authorId: author.id,
          visibility: "INTERNAL",
          type: "COMMENT",
        },
      });
    }
  }

  console.log(`  ✅ ${threads.length} threads with messages created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n🎉 Seed completed!");
  console.log(`  Users: ${allUsers.length} (1 admin, 100 contractors, 5 processors, 5 coordinators, 3 accountants, 2 client managers, 2 processor incharges, 2 incharge CMs, 2 incharge coordinators, 5 clients)`);
  console.log(`  Properties: ${properties.length}`);
  console.log(`  Work Orders: ${workOrders.length}`);
  console.log(`  Channels: ${createdChannels.length + dmChannels.length} (${createdChannels.length} public, ${dmChannels.length} DMs)`);
  console.log(`  Invoices: ${invoices.length}`);
  console.log(`  Support Tickets: ${tickets.length}`);
  console.log(`  Activity Logs: ${activityLogs.length}`);
  console.log(`\n📋 Demo accounts (all use password: password123):`);
  console.log(`  Admin: admin@proppreserve.com`);
  console.log(`  Coordinators: coordinator1-5@proppreserve.com`);
  console.log(`  Processors: processor1-5@proppreserve.com`);
  console.log(`  Contractors: contractor1-100@proppreserve.com`);
  console.log(`  Clients: client1-5@proppreserve.com`);
  console.log(`  Accountants: accountant1-3@proppreserve.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
