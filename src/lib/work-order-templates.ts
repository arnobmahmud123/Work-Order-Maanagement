
export interface WorkOrderTemplate {
  id: string;
  client: string;
  category: string;
  title: string;
  description: string;
  serviceType: string;
  tasks: {
    title: string;
    description: string;
  }[];
  specialInstructions?: string;
}

export const WORK_ORDER_TEMPLATES: WorkOrderTemplate[] = [
  // ─── MCS (Mortgage Contracting Services) ──────────────────────────────────
  {
    id: "mcs-initial-secure",
    client: "MCS",
    category: "Initial Secure",
    title: "MCS Initial Secure",
    description: "Standard initial secure work order for MCS properties. Includes securing, occupancy verification, and hazard identification.",
    serviceType: "INSPECTION",
    tasks: [
      { title: "Verify Occupancy", description: "Determine if property is vacant or occupied. Look for mail, utility status, and personal items." },
      { title: "Post Emergency Contact Notice", description: "Post the required MCS emergency contact notice in a visible front window." },
      { title: "Secure Main Entry", description: "Change locks on the main entry door to MCS standard key code. Install lockbox." },
      { title: "Secure Secondary Entries", description: "Verify all other doors and windows are locked. Board or repair if necessary (submit bid if extensive)." },
      { title: "Interior Debris Assessment", description: "Perform a room-by-room assessment of debris. Categorize as Health/Safety or General Debris." },
      { title: "Identify Safety Hazards", description: "Look for trip hazards, mold, standing water, or structural issues. Photo all findings." },
      { title: "Utility Status Check", description: "Check if water, gas, and electric are ON or OFF. Document meter readings if possible." }
    ],
    specialInstructions: "Always take a property front photo with the address clearly visible. Use MCS standard lock sets only."
  },
  {
    id: "mcs-grass-cut",
    client: "MCS",
    category: "Grass Cut",
    title: "MCS Grass Cut",
    description: "Routine lawn maintenance for MCS properties.",
    serviceType: "GRASS_CUT",
    tasks: [
      { title: "Front Yard Mow & Edge", description: "Mow grass to 3 inches. Edge walkways, driveway, and curb line." },
      { title: "Back Yard Mow & Trim", description: "Mow back yard completely. Trim around fence line and structures." },
      { title: "Remove Clippings", description: "Ensure all clippings are removed from hard surfaces and flower beds." },
      { title: "Perimeter Inspection", description: "Check for any new debris or exterior damage since last visit." }
    ]
  },

  // ─── Cyprexx ──────────────────────────────────────────────────────────────
  {
    id: "cyprexx-initial-secure",
    client: "Cyprexx",
    category: "Initial Secure",
    title: "Cyprexx Initial Secure",
    description: "Initial secure requirements for Cyprexx client. Includes HUD lock set requirements.",
    serviceType: "INSPECTION",
    tasks: [
      { title: "Occupancy Verification", description: "Confirm property is vacant. Take photos of mail, utilities, and exterior indicators." },
      { title: "HUD Lock Set Installation", description: "Install HUD standard lock set on primary entry. Code: [Client Specified]." },
      { title: "Exterior/Interior Condition Photos", description: "Comprehensive photo set of every room and all exterior angles." },
      { title: "Winterization Check", description: "Check if property requires winterization based on current temperature and season." },
      { title: "Debris & Hazard Report", description: "Detail any interior or exterior debris. Identify hazardous conditions immediately." }
    ],
    specialInstructions: "Cyprexx requires 'Before, During, and After' photos for every task performed."
  },
  {
    id: "cyprexx-grass-cut",
    client: "Cyprexx",
    category: "Grass Cut",
    title: "Cyprexx Grass Cut",
    description: "Standard grass cut for Cyprexx properties.",
    serviceType: "GRASS_CUT",
    tasks: [
      { title: "Pre-Cut Property Photos", description: "Take 'Before' photos from all angles showing grass height." },
      { title: "Mow and Trim Yard", description: "Mow all areas of the yard. Trim around obstacles." },
      { title: "Post-Cut Property Photos", description: "Take 'After' photos from same angles as 'Before' photos." },
      { title: "Check for Yard Debris", description: "Remove any small yard debris (trash, branches) before mowing." }
    ]
  },

  // ─── MSI (Mortgage Service Pros) ───────────────────────────────────────────
  {
    id: "msi-initial-secure",
    client: "MSI",
    category: "Initial Secure",
    title: "MSI Initial Secure",
    description: "Initial secure and inspection for MSI properties.",
    serviceType: "INSPECTION",
    tasks: [
      { title: "Confirm Vacancy", description: "Detailed check for occupancy. Document any evidence of recent activity." },
      { title: "Secure Property", description: "Lock all windows and doors. Install MSI specified lock and lockbox." },
      { title: "Full Property Inspection", description: "Inspect roof, basement, and all rooms for damage or leaks." },
      { title: "Utility Verification", description: "Confirm status of water, gas, and electric." },
      { title: "Photo Documentation", description: "Minimum of 50 photos required for initial secure/inspection." }
    ]
  },
  {
    id: "msi-grass-cut",
    client: "MSI",
    category: "Grass Cut",
    title: "MSI Grass Cut",
    description: "Routine lawn maintenance for MSI properties.",
    serviceType: "GRASS_CUT",
    tasks: [
      { title: "Before Photos", description: "Photos from all angles showing height." },
      { title: "Mow and Edge", description: "Complete mow and edge of all grass areas." },
      { title: "After Photos", description: "Photos from same angles as before photos." }
    ]
  },

  // ─── Altisource ────────────────────────────────────────────────────────────
  {
    id: "altisource-initial-secure",
    client: "Altisource",
    category: "Initial Secure",
    title: "Altisource Initial Secure",
    description: "Altisource specific initial secure requirements.",
    serviceType: "INSPECTION",
    tasks: [
      { title: "Occupancy Verification", description: "Determine if property is vacant. Take interior/exterior indicators." },
      { title: "Lock Change", description: "Install Altisource approved lock set and lockbox." },
      { title: "Property Condition Report", description: "Identify all damages, debris, and hazards." },
      { title: "Winterize if Required", description: "Dry winterization of all plumbing fixtures." }
    ]
  },
  {
    id: "altisource-lock-change",
    client: "Altisource",
    category: "Lock Change",
    title: "Altisource Lock Change",
    description: "Specific lock change requirements for Altisource.",
    serviceType: "OTHER",
    tasks: [
      { title: "Change Entry Locks", description: "Install Altisource approved lock set." },
      { title: "Verify All Entry Points", description: "Check all doors and windows to ensure property is fully secure." },
      { title: "Install Lockbox", description: "Secure lockbox with key to a permanent fixture." }
    ]
  },

  // ─── ServiceLink ───────────────────────────────────────────────────────────
  {
    id: "servicelink-initial-secure",
    client: "ServiceLink",
    category: "Initial Secure",
    title: "ServiceLink Initial Secure",
    description: "Standard secure work for ServiceLink properties.",
    serviceType: "INSPECTION",
    tasks: [
      { title: "Occupancy Check", description: "Verify vacancy. Photo evidence required." },
      { title: "Secure Property", description: "Install locks and secure all openings." },
      { title: "Full Interior/Exterior Inspection", description: "Document condition and any hazards." }
    ]
  },
  {
    id: "servicelink-eviction",
    client: "ServiceLink",
    category: "Eviction",
    title: "ServiceLink Eviction",
    description: "Eviction coordination and secure for ServiceLink.",
    serviceType: "DEBRIS_REMOVAL",
    tasks: [
      { title: "Eviction Attendance", description: "Meet with sheriff and perform eviction." },
      { title: "Initial Debris Removal", description: "Remove all personal property and debris." },
      { title: "Secure and Lock Change", description: "Secure property immediately after eviction." }
    ]
  },

  // ─── Generic / Common Templates ────────────────────────────────────────────
  {
    id: "generic-eviction",
    client: "Generic",
    category: "Eviction",
    title: "Standard Eviction Work Order",
    description: "Template for handling an eviction. Includes debris removal and lock change.",
    serviceType: "DEBRIS_REMOVAL",
    tasks: [
      { title: "Meet Sheriff/Official", description: "Coordinate with local officials for property entry." },
      { title: "Remove Personal Property", description: "Remove all remaining personal items from interior and exterior." },
      { title: "Change Locks", description: "Immediately change all entry locks once property is cleared." },
      { title: "Cleaning / Janitorial", description: "Sweep and wipe down surfaces to prepare for marketing." },
      { title: "Comprehensive Photo Set", description: "Document the state of the property before and after eviction." }
    ]
  },
  {
    id: "generic-preeviction",
    client: "Generic",
    category: "Pre-eviction",
    title: "Pre-eviction Inspection",
    description: "Initial inspection before scheduled eviction.",
    serviceType: "INSPECTION",
    tasks: [
      { title: "Occupancy Check", description: "Verify if occupants are still present." },
      { title: "Condition Assessment", description: "Estimate debris volume and identify any hazards." },
      { title: "Photo Documentation", description: "Take exterior photos without disturbing occupants." }
    ]
  },
  {
    id: "generic-lock-change",
    client: "Generic",
    category: "Lock Change",
    title: "Standard Lock Change",
    description: "Simple lock change and resecure template.",
    serviceType: "OTHER",
    tasks: [
      { title: "Replace Main Lock", description: "Install new deadbolt and entry handle." },
      { title: "Install Lockbox", description: "Mount lockbox on front door or railing." },
      { title: "Secure Windows", description: "Ensure all windows are locked and intact." }
    ]
  },
  {
    id: "generic-resecure",
    client: "Generic",
    category: "Resecure",
    title: "Property Resecure",
    description: "Resecuring a property that has been compromised.",
    serviceType: "BOARD_UP",
    tasks: [
      { title: "Identify Compromised Points", description: "Find all broken windows, doors, or damaged locks." },
      { title: "Board Up Openings", description: "Install plywood over broken windows or doors." },
      { title: "Repair/Replace Locks", description: "Ensure all entry points have functional locks." },
      { title: "Photo Documentation", description: "Before/After photos of all resecured areas." }
    ]
  }
];
