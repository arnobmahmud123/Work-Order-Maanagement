import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

// Realistic contractor data with fixed names & addresses
const CONTRACTORS = [
  { name: "Sandra Murphy", email: "sandra.murphy@proppreserve.com", company: "Murphy Property Services", address: "567 Walnut Street", city: "Naperville", state: "IL", zipCode: "60540", latitude: 41.7508, longitude: -88.1535, specialties: ["GRASS_CUT", "DEBRIS_REMOVAL", "WINTERIZATION"], skills: ["Lawn Care", "Landscaping", "Snow Removal"], bio: "15+ years in property preservation. Specializing in grass cuts and debris removal. Fast turnaround guaranteed.", hourlyRate: 55, isAvailable: true },
  { name: "Michael Torres", email: "michael.torres@proppreserve.com", company: "Torres Contracting LLC", address: "1205 Oak Street", city: "Springfield", state: "IL", zipCode: "62701", latitude: 39.7817, longitude: -89.6501, specialties: ["BOARD_UP", "WINTERIZATION", "INSPECTION"], skills: ["Board Up", "Window Repair", "Door Installation"], bio: "Licensed contractor with expertise in board-ups and securing vacant properties. Available 24/7 for emergencies.", hourlyRate: 65, isAvailable: true },
  { name: "James Wilson", email: "james.wilson@proppreserve.com", company: "Wilson Preservation Co.", address: "3421 Maple Avenue", city: "Decatur", state: "IL", zipCode: "62521", latitude: 39.8403, longitude: -88.9548, specialties: ["WINTERIZATION", "MOLD_REMEDIATION", "OTHER"], skills: ["Winterization", "Plumbing", "HVAC"], bio: "Full-service winterization specialist. Former plumber with 20 years experience. Insured and bonded.", hourlyRate: 75, isAvailable: true },
  { name: "David Chen", email: "david.chen@proppreserve.com", company: "Chen Property Care", address: "789 Pine Road", city: "Champaign", state: "IL", zipCode: "61820", latitude: 40.1164, longitude: -88.2434, specialties: ["DEBRIS_REMOVAL", "GRASS_CUT", "OTHER"], skills: ["Debris Removal", "Junk Hauling", "Cleanout"], bio: "Professional debris removal and property cleanout. We handle everything from single items to full house cleanouts.", hourlyRate: 45, isAvailable: true },
  { name: "Robert Garcia", email: "robert.garcia@proppreserve.com", company: "Garcia Inspection Services", address: "456 Elm Boulevard", city: "Peoria", state: "IL", zipCode: "61602", latitude: 40.6936, longitude: -89.589, specialties: ["INSPECTION", "GRASS_CUT", "DEBRIS_REMOVAL"], skills: ["Inspection", "Photography", "Report Writing"], bio: "Certified home inspector with attention to detail. Comprehensive reports delivered within 24 hours.", hourlyRate: 85, isAvailable: true },
  { name: "Christopher Martinez", email: "chris.martinez@proppreserve.com", company: "Martinez Mold Solutions", address: "2134 Cedar Lane", city: "Bloomington", state: "IL", zipCode: "61701", latitude: 40.4842, longitude: -88.9937, specialties: ["MOLD_REMEDIATION", "OTHER", "WINTERIZATION"], skills: ["Mold Remediation", "Water Damage", "Restoration"], bio: "Mold remediation certified (IICRC). Water damage restoration specialist. Emergency response available.", hourlyRate: 95, isAvailable: true },
  { name: "Kevin O'Brien", email: "kevin.obrien@proppreserve.com", company: "O'Brien Roofing & Exteriors", address: "8901 Birch Drive", city: "Rockford", state: "IL", zipCode: "61101", latitude: 42.2711, longitude: -89.094, specialties: ["OTHER", "BOARD_UP", "DEBRIS_REMOVAL"], skills: ["Roofing", "Gutters", "Siding"], bio: "Roofing and exterior maintenance. Licensed, insured, and certified. Free estimates on all work.", hourlyRate: 85, isAvailable: true },
  { name: "Brian Jackson", email: "brian.jackson@proppreserve.com", company: "Jackson Interior Renovations", address: "3210 Cherry Avenue", city: "Joliet", state: "IL", zipCode: "60431", latitude: 41.525, longitude: -88.0817, specialties: ["OTHER", "BOARD_UP", "GRASS_CUT"], skills: ["Painting", "Drywall", "Flooring"], bio: "Interior renovation expert. Painting, drywall, flooring - we do it all. Quality craftsmanship guaranteed.", hourlyRate: 65, isAvailable: true },
  { name: "Marcus Thompson", email: "marcus.thompson@proppreserve.com", company: "Thompson Electric", address: "1456 Willow Road", city: "Columbus", state: "OH", zipCode: "43215", latitude: 39.9612, longitude: -82.9988, specialties: ["OTHER", "INSPECTION", "WINTERIZATION"], skills: ["Electrical", "Lighting", "Security Systems"], bio: "Licensed electrician specializing in vacant property repairs. Safety inspections and code compliance.", hourlyRate: 85, isAvailable: true },
  { name: "Anthony Davis", email: "anthony.davis@proppreserve.com", company: "Davis Lock & Key", address: "2789 Ash Boulevard", city: "Cleveland", state: "OH", zipCode: "44114", latitude: 41.4993, longitude: -81.6944, specialties: ["OTHER", "BOARD_UP", "INSPECTION"], skills: ["Locksmith", "Rekeying", "Access Control"], bio: "Professional locksmith services. Rekeying, lock changes, and access solutions for property management.", hourlyRate: 75, isAvailable: true },
  { name: "Jason Lee", email: "jason.lee@proppreserve.com", company: "Lee Property Solutions", address: "654 Poplar Lane", city: "Cincinnati", state: "OH", zipCode: "45202", latitude: 39.1031, longitude: -84.512, specialties: ["GRASS_CUT", "DEBRIS_REMOVAL", "BOARD_UP"], skills: ["Lawn Care", "Landscaping", "Board Up"], bio: "Full-service property maintenance. Grass cuts, debris removal, and board-ups. Same-day service available.", hourlyRate: 45, isAvailable: true },
  { name: "Ryan Cooper", email: "ryan.cooper@proppreserve.com", company: "Cooper Contracting", address: "3123 Hickory Drive", city: "Dayton", state: "OH", zipCode: "45402", latitude: 39.7589, longitude: -84.1916, specialties: ["WINTERIZATION", "GRASS_CUT", "INSPECTION"], skills: ["Winterization", "Lawn Care", "Inspection"], bio: "Reliable property preservation services. Winterization specialist with quick turnaround times.", hourlyRate: 55, isAvailable: true },
  { name: "Timothy Brown", email: "timothy.brown@proppreserve.com", company: "Brown Restoration Group", address: "987 Magnolia Street", city: "Indianapolis", state: "IN", zipCode: "46204", latitude: 39.7684, longitude: -86.1581, specialties: ["MOLD_REMEDIATION", "WINTERIZATION", "OTHER"], skills: ["Mold Remediation", "Water Damage", "Restoration"], bio: "IICRC certified restoration specialist. Mold remediation, water damage, and fire damage restoration.", hourlyRate: 95, isAvailable: true },
  { name: "Eric Phillips", email: "eric.phillips@proppreserve.com", company: "Phillips Property Maintenance", address: "4562 Cypress Avenue", city: "Fort Wayne", state: "IN", zipCode: "46802", latitude: 41.0793, longitude: -85.1394, specialties: ["GRASS_CUT", "DEBRIS_REMOVAL", "BOARD_UP"], skills: ["Lawn Care", "Debris Removal", "Board Up"], bio: "Affordable property maintenance services. Grass cuts starting at $35. Free estimates.", hourlyRate: 45, isAvailable: true },
  { name: "Stephen Mitchell", email: "stephen.mitchell@proppreserve.com", company: "Mitchell Preservation LLC", address: "1890 Spruce Road", city: "Evansville", state: "IN", zipCode: "47708", latitude: 37.9716, longitude: -87.5711, specialties: ["BOARD_UP", "WINTERIZATION", "INSPECTION"], skills: ["Board Up", "Winterization", "Inspection"], bio: "Securing and preserving vacant properties since 2005. Licensed and insured for $2M.", hourlyRate: 65, isAvailable: true },
  { name: "Andrew Peterson", email: "andrew.peterson@proppreserve.com", company: "Peterson Property Care", address: "7234 Sycamore Boulevard", city: "Detroit", state: "MI", zipCode: "48226", latitude: 42.3314, longitude: -83.0458, specialties: ["BOARD_UP", "DEBRIS_REMOVAL", "GRASS_CUT"], skills: ["Board Up", "Debris Removal", "Lawn Care"], bio: "Detroit area property preservation specialist. Emergency board-up service available 24/7.", hourlyRate: 55, isAvailable: true },
  { name: "Joshua Adams", email: "joshua.adams@proppreserve.com", company: "Adams Exteriors", address: "561 Juniper Lane", city: "Grand Rapids", state: "MI", zipCode: "49503", latitude: 42.9634, longitude: -85.6681, specialties: ["GRASS_CUT", "OTHER", "DEBRIS_REMOVAL"], skills: ["Lawn Care", "Snow Removal", "Landscaping"], bio: "Year-round property maintenance. Spring cleanups, summer mowing, fall leaf removal, winter snow clearing.", hourlyRate: 45, isAvailable: true },
  { name: "Brandon Wright", email: "brandon.wright@proppreserve.com", company: "Wright Restoration", address: "2345 Dogwood Drive", city: "Lansing", state: "MI", zipCode: "48933", latitude: 42.7325, longitude: -84.5555, specialties: ["MOLD_REMEDIATION", "WINTERIZATION", "OTHER"], skills: ["Mold Remediation", "Water Damage", "Restoration"], bio: "Water damage and mold restoration experts. Available for emergency calls. IICRC certified.", hourlyRate: 85, isAvailable: true },
  { name: "Gregory Nelson", email: "gregory.nelson@proppreserve.com", company: "Nelson Property Services", address: "890 Chestnut Street", city: "Milwaukee", state: "WI", zipCode: "53202", latitude: 43.0389, longitude: -87.9065, specialties: ["GRASS_CUT", "WINTERIZATION", "DEBRIS_REMOVAL"], skills: ["Lawn Care", "Winterization", "Debris Removal"], bio: "Milwaukee area property preservation. Reliable, affordable, and professional service.", hourlyRate: 50, isAvailable: true },
  { name: "Patrick Kelly", email: "patrick.kelly@proppreserve.com", company: "Kelly Contracting Group", address: "1234 Laurel Avenue", city: "Madison", state: "WI", zipCode: "53703", latitude: 43.0731, longitude: -89.4012, specialties: ["BOARD_UP", "INSPECTION", "OTHER"], skills: ["Board Up", "Inspection", "Locksmith"], bio: "Full-service property securing. Board-ups, inspections, lock changes, and winterization.", hourlyRate: 65, isAvailable: true },
  { name: "Nathan Rivera", email: "nathan.rivera@proppreserve.com", company: "Rivera Preservation", address: "5678 Holly Road", city: "Green Bay", state: "WI", zipCode: "54301", latitude: 44.5133, longitude: -88.0133, specialties: ["WINTERIZATION", "GRASS_CUT", "INSPECTION"], skills: ["Winterization", "Lawn Care", "Inspection"], bio: "Green Bay's trusted property preservation company. Fast response, quality work.", hourlyRate: 55, isAvailable: true },
  { name: "Samuel Brooks", email: "samuel.brooks@proppreserve.com", company: "Brooks Maintenance Co.", address: "3456 Ivy Boulevard", city: "St. Louis", state: "MO", zipCode: "63101", latitude: 38.627, longitude: -90.1994, specialties: ["GRASS_CUT", "DEBRIS_REMOVAL", "BOARD_UP"], skills: ["Lawn Care", "Debris Removal", "Board Up"], bio: "St. Louis metro area property maintenance. Same-day service available for urgent needs.", hourlyRate: 45, isAvailable: true },
  { name: "Donald Campbell", email: "donald.campbell@proppreserve.com", company: "Campbell Property Solutions", address: "9012 Fern Lane", city: "Kansas City", state: "MO", zipCode: "64106", latitude: 39.0997, longitude: -94.5786, specialties: ["BOARD_UP", "WINTERIZATION", "MOLD_REMEDIATION"], skills: ["Board Up", "Winterization", "Mold Remediation"], bio: "Kansas City property preservation specialist. Board-ups and winterizations are our specialty.", hourlyRate: 65, isAvailable: true },
  { name: "Raymond Parker", email: "raymond.parker@proppreserve.com", company: "Parker Services LLC", address: "4321 Alder Drive", city: "Springfield", state: "MO", zipCode: "65806", latitude: 37.209, longitude: -93.2923, specialties: ["GRASS_CUT", "INSPECTION", "DEBRIS_REMOVAL"], skills: ["Lawn Care", "Inspection", "Debris Removal"], bio: "Southwest Missouri property services. Grass cuts, inspections, and cleanouts.", hourlyRate: 40, isAvailable: true },
  { name: "Frank Simmons", email: "frank.simmons@proppreserve.com", company: "Simmons Restoration", address: "6789 Beech Street", city: "Louisville", state: "KY", zipCode: "40202", latitude: 38.2527, longitude: -85.7585, specialties: ["MOLD_REMEDIATION", "OTHER", "WINTERIZATION"], skills: ["Mold Remediation", "Water Damage", "Restoration"], bio: "Kentucky's premier restoration company. Mold, water, and fire damage specialists.", hourlyRate: 90, isAvailable: true },
  { name: "Alexander Hayes", email: "alexander.hayes@proppreserve.com", company: "Hayes Property Care", address: "234 Mulberry Avenue", city: "Lexington", state: "KY", zipCode: "40507", latitude: 38.0406, longitude: -84.5037, specialties: ["GRASS_CUT", "DEBRIS_REMOVAL", "WINTERIZATION"], skills: ["Lawn Care", "Debris Removal", "Winterization"], bio: "Lexington area property maintenance. Professional service at competitive prices.", hourlyRate: 45, isAvailable: true },
  { name: "Douglas Foster", email: "douglas.foster@proppreserve.com", company: "Foster Contracting", address: "8765 Pecan Road", city: "Nashville", state: "TN", zipCode: "37203", latitude: 36.1627, longitude: -86.7816, specialties: ["BOARD_UP", "GRASS_CUT", "INSPECTION"], skills: ["Board Up", "Lawn Care", "Inspection"], bio: "Nashville metro property preservation. Board-ups, grass cuts, and inspections done right.", hourlyRate: 55, isAvailable: true },
  { name: "Henry Russell", email: "henry.russell@proppreserve.com", company: "Russell Exteriors Inc.", address: "1098 Laurel Boulevard", city: "Memphis", state: "TN", zipCode: "38103", latitude: 35.1495, longitude: -90.049, specialties: ["OTHER", "BOARD_UP", "DEBRIS_REMOVAL"], skills: ["Roofing", "Gutters", "Siding"], bio: "Memphis area exterior maintenance. Roofing, gutters, siding, and board-ups.", hourlyRate: 75, isAvailable: true },
  { name: "Carl Henderson", email: "carl.henderson@proppreserve.com", company: "Henderson Property Services", address: "5432 Clover Lane", city: "Knoxville", state: "TN", zipCode: "37902", latitude: 35.9606, longitude: -83.9207, specialties: ["GRASS_CUT", "WINTERIZATION", "DEBRIS_REMOVAL"], skills: ["Lawn Care", "Winterization", "Debris Removal"], bio: "Knoxville's reliable property preservation team. Serving the community since 2010.", hourlyRate: 45, isAvailable: true },
  { name: "Wayne Morgan", email: "wayne.morgan@proppreserve.com", company: "Morgan Preservation Group", address: "765 Sage Drive", city: "Atlanta", state: "GA", zipCode: "30303", latitude: 33.749, longitude: -84.388, specialties: ["BOARD_UP", "MOLD_REMEDIATION", "INSPECTION"], skills: ["Board Up", "Mold Remediation", "Inspection"], bio: "Atlanta area preservation specialist. Board-ups, mold remediation, and property inspections.", hourlyRate: 75, isAvailable: true },
];

async function main() {
  console.log("🌱 Seeding contractor profiles...");

  // Find or create contractor users
  const hashedPassword = "$2b$10$defaulthashedpassword"; // placeholder

  for (const c of CONTRACTORS) {
    // Find user by email
    let user = await prisma.user.findUnique({ where: { email: c.email } });

    if (!user) {
      // Create user with CONTRACTOR role
      user = await prisma.user.create({
        data: {
          name: c.name,
          email: c.email,
          hashedPassword,
          role: "CONTRACTOR",
          company: c.company,
          phone: `(555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
          image: `https://i.pravatar.cc/150?u=${c.email}`,
          isActive: true,
        },
      });
      console.log(`  ✅ Created user: ${c.name} (${c.email})`);
    } else {
      // Make sure existing user has CONTRACTOR role
      if (user.role !== "CONTRACTOR") {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "CONTRACTOR" },
        });
        console.log(`  🔄 Updated role to CONTRACTOR: ${c.name}`);
      }
    }

    // Create or update contractor profile
    await prisma.contractorProfile.upsert({
      where: { userId: user.id },
      update: {
        address: c.address,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        latitude: c.latitude,
        longitude: c.longitude,
        specialties: c.specialties,
        skills: c.skills,
        bio: c.bio,
        hourlyRate: c.hourlyRate,
        isAvailable: c.isAvailable,
        serviceRadius: 50,
        avgRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        totalRatings: Math.floor(3 + Math.random() * 47),
        completedJobs: Math.floor(5 + Math.random() * 145),
        totalJobs: Math.floor(10 + Math.random() * 190),
        reliabilityScore: Math.round((70 + Math.random() * 30) * 10) / 10,
        responseTime: Math.floor(5 + Math.random() * 115),
      },
      create: {
        userId: user.id,
        address: c.address,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        latitude: c.latitude,
        longitude: c.longitude,
        specialties: c.specialties,
        skills: c.skills,
        bio: c.bio,
        hourlyRate: c.hourlyRate,
        isAvailable: c.isAvailable,
        serviceRadius: 50,
        avgRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        totalRatings: Math.floor(3 + Math.random() * 47),
        completedJobs: Math.floor(5 + Math.random() * 145),
        totalJobs: Math.floor(10 + Math.random() * 190),
        reliabilityScore: Math.round((70 + Math.random() * 30) * 10) / 10,
        responseTime: Math.floor(5 + Math.random() * 115),
      },
    });
    console.log(`  ✅ Profile: ${c.name} — ${c.address}, ${c.city}, ${c.state} ${c.zipCode}`);
  }

  console.log(`\n🎉 Done! ${CONTRACTORS.length} contractor profiles created.`);
  console.log(`\n🔍 Try searching "60540" to find Sandra Murphy.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
