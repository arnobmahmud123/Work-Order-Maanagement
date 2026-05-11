import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

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

const CONTRACTOR_ADDRESSES: { address: string; city: string; state: string; zipCode: string; latitude: number; longitude: number }[] = [
  { address: "1205 Oak Street", city: "Springfield", state: "IL", zipCode: "62701", latitude: 39.7817, longitude: -89.6501 },
  { address: "3421 Maple Avenue", city: "Decatur", state: "IL", zipCode: "62521", latitude: 39.8403, longitude: -88.9548 },
  { address: "789 Pine Road", city: "Champaign", state: "IL", zipCode: "61820", latitude: 40.1164, longitude: -88.2434 },
  { address: "456 Elm Boulevard", city: "Peoria", state: "IL", zipCode: "61602", latitude: 40.6936, longitude: -89.5890 },
  { address: "2134 Cedar Lane", city: "Bloomington", state: "IL", zipCode: "61701", latitude: 40.4842, longitude: -88.9937 },
  { address: "8901 Birch Drive", city: "Rockford", state: "IL", zipCode: "61101", latitude: 42.2711, longitude: -89.0940 },
  { address: "567 Walnut Street", city: "Naperville", state: "IL", zipCode: "60540", latitude: 41.7508, longitude: -88.1535 },
  { address: "3210 Cherry Avenue", city: "Joliet", state: "IL", zipCode: "60431", latitude: 41.5250, longitude: -88.0817 },
  { address: "1456 Willow Road", city: "Columbus", state: "OH", zipCode: "43215", latitude: 39.9612, longitude: -82.9988 },
  { address: "2789 Ash Boulevard", city: "Cleveland", state: "OH", zipCode: "44114", latitude: 41.4993, longitude: -81.6944 },
  { address: "654 Poplar Lane", city: "Cincinnati", state: "OH", zipCode: "45202", latitude: 39.1031, longitude: -84.5120 },
  { address: "3123 Hickory Drive", city: "Dayton", state: "OH", zipCode: "45402", latitude: 39.7589, longitude: -84.1916 },
  { address: "987 Magnolia Street", city: "Indianapolis", state: "IN", zipCode: "46204", latitude: 39.7684, longitude: -86.1581 },
  { address: "4562 Cypress Avenue", city: "Fort Wayne", state: "IN", zipCode: "46802", latitude: 41.0793, longitude: -85.1394 },
  { address: "1890 Spruce Road", city: "Evansville", state: "IN", zipCode: "47708", latitude: 37.9716, longitude: -87.5711 },
  { address: "7234 Sycamore Boulevard", city: "Detroit", state: "MI", zipCode: "48226", latitude: 42.3314, longitude: -83.0458 },
  { address: "561 Juniper Lane", city: "Grand Rapids", state: "MI", zipCode: "49503", latitude: 42.9634, longitude: -85.6681 },
  { address: "2345 Dogwood Drive", city: "Lansing", state: "MI", zipCode: "48933", latitude: 42.7325, longitude: -84.5555 },
  { address: "890 Chestnut Street", city: "Milwaukee", state: "WI", zipCode: "53202", latitude: 43.0389, longitude: -87.9065 },
  { address: "1234 Laurel Avenue", city: "Madison", state: "WI", zipCode: "53703", latitude: 43.0731, longitude: -89.4012 },
  { address: "5678 Holly Road", city: "Green Bay", state: "WI", zipCode: "54301", latitude: 44.5133, longitude: -88.0133 },
  { address: "3456 Ivy Boulevard", city: "St. Louis", state: "MO", zipCode: "63101", latitude: 38.6270, longitude: -90.1994 },
  { address: "9012 Fern Lane", city: "Kansas City", state: "MO", zipCode: "64106", latitude: 39.0997, longitude: -94.5786 },
  { address: "4321 Alder Drive", city: "Springfield", state: "MO", zipCode: "65806", latitude: 37.2090, longitude: -93.2923 },
  { address: "6789 Beech Street", city: "Louisville", state: "KY", zipCode: "40202", latitude: 38.2527, longitude: -85.7585 },
  { address: "234 Mulberry Avenue", city: "Lexington", state: "KY", zipCode: "40507", latitude: 38.0406, longitude: -84.5037 },
  { address: "8765 Pecan Road", city: "Nashville", state: "TN", zipCode: "37203", latitude: 36.1627, longitude: -86.7816 },
  { address: "1098 Laurel Boulevard", city: "Memphis", state: "TN", zipCode: "38103", latitude: 35.1495, longitude: -90.0490 },
  { address: "5432 Clover Lane", city: "Knoxville", state: "TN", zipCode: "37902", latitude: 35.9606, longitude: -83.9207 },
  { address: "765 Sage Drive", city: "Atlanta", state: "GA", zipCode: "30303", latitude: 33.7490, longitude: -84.3880 },
  { address: "3210 Primrose Street", city: "Savannah", state: "GA", zipCode: "31401", latitude: 32.0809, longitude: -81.0912 },
  { address: "9876 Rosewood Avenue", city: "Charlotte", state: "NC", zipCode: "28202", latitude: 35.2271, longitude: -80.8431 },
  { address: "4567 Timber Road", city: "Raleigh", state: "NC", zipCode: "27601", latitude: 35.7796, longitude: -78.6382 },
  { address: "2109 Forest Boulevard", city: "Birmingham", state: "AL", zipCode: "35203", latitude: 33.5207, longitude: -86.8025 },
  { address: "6543 Meadow Lane", city: "Huntsville", state: "AL", zipCode: "35801", latitude: 34.7304, longitude: -86.5861 },
  { address: "876 Valley Drive", city: "Jackson", state: "MS", zipCode: "39201", latitude: 32.2988, longitude: -90.1848 },
  { address: "3456 Ridge Street", city: "New Orleans", state: "LA", zipCode: "70112", latitude: 29.9511, longitude: -90.0715 },
  { address: "9012 Summit Avenue", city: "Baton Rouge", state: "LA", zipCode: "70801", latitude: 30.4515, longitude: -91.1871 },
  { address: "5678 Highland Road", city: "Houston", state: "TX", zipCode: "77002", latitude: 29.7604, longitude: -95.3698 },
  { address: "2345 Lake Boulevard", city: "Dallas", state: "TX", zipCode: "75201", latitude: 32.7767, longitude: -96.7970 },
  { address: "8901 River Lane", city: "San Antonio", state: "TX", zipCode: "78205", latitude: 29.4241, longitude: -98.4936 },
  { address: "4321 Creek Drive", city: "Austin", state: "TX", zipCode: "78701", latitude: 30.2672, longitude: -97.7431 },
  { address: "1234 Oak Street", city: "Phoenix", state: "AZ", zipCode: "85004", latitude: 33.4484, longitude: -112.0740 },
  { address: "5678 Maple Avenue", city: "Tucson", state: "AZ", zipCode: "85701", latitude: 32.2226, longitude: -110.9747 },
  { address: "9012 Pine Road", city: "Denver", state: "CO", zipCode: "80202", latitude: 39.7392, longitude: -104.9903 },
  { address: "3456 Elm Boulevard", city: "Colorado Springs", state: "CO", zipCode: "80903", latitude: 38.8339, longitude: -104.8214 },
  { address: "7890 Cedar Lane", city: "Las Vegas", state: "NV", zipCode: "89101", latitude: 36.1699, longitude: -115.1398 },
  { address: "2345 Birch Drive", city: "Reno", state: "NV", zipCode: "89501", latitude: 39.5296, longitude: -119.8138 },
  { address: "6789 Walnut Street", city: "Portland", state: "OR", zipCode: "97201", latitude: 45.5152, longitude: -122.6784 },
  { address: "1234 Cherry Avenue", city: "Seattle", state: "WA", zipCode: "98101", latitude: 47.6062, longitude: -122.3321 },
  { address: "5678 Willow Road", city: "Spokane", state: "WA", zipCode: "99201", latitude: 47.6588, longitude: -117.4260 },
];

function getContractorAddress(index: number) {
  return CONTRACTOR_ADDRESSES[index % CONTRACTOR_ADDRESSES.length];
}

async function main() {
  console.log("🌱 Seeding network & additional demo data...");

  const admin = await prisma.user.findUnique({ where: { email: "admin@proppreserve.com" } });
  if (!admin) { console.error("Run main seed first!"); return; }

  const contractors = await prisma.user.findMany({ where: { role: "CONTRACTOR" }, take: 30 });
  const coordinators = await prisma.user.findMany({ where: { role: "COORDINATOR" } });
  const clients = await prisma.user.findMany({ where: { role: "CLIENT" } });
  const processors = await prisma.user.findMany({ where: { role: "PROCESSOR" } });
  const workOrders = await prisma.workOrder.findMany({ take: 50 });

  // ═══════════════════════════════════════════════════════════════════
  // CONTRACTOR PROFILES
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating contractor profiles...");

  const skillSets = [
    ["Lawn Care", "Landscaping", "Snow Removal"],
    ["Board Up", "Window Repair", "Door Installation"],
    ["Winterization", "Plumbing", "HVAC"],
    ["Debris Removal", "Junk Hauling", "Cleanout"],
    ["Inspection", "Photography", "Report Writing"],
    ["Mold Remediation", "Water Damage", "Restoration"],
    ["Roofing", "Gutters", "Siding"],
    ["Painting", "Drywall", "Flooring"],
    ["Electrical", "Lighting", "Security Systems"],
    ["Locksmith", "Rekeying", "Access Control"],
  ];

  const bios = [
    "15+ years in property preservation. Specializing in grass cuts and debris removal. Fast turnaround guaranteed.",
    "Licensed contractor with expertise in board-ups and securing vacant properties. Available 24/7 for emergencies.",
    "Full-service winterization specialist. Former plumber with 20 years experience. Insured and bonded.",
    "Professional debris removal and property cleanout. We handle everything from single items to full house cleanouts.",
    "Certified home inspector with attention to detail. Comprehensive reports delivered within 24 hours.",
    "Mold remediation certified (IICRC). Water damage restoration specialist. Emergency response available.",
    "Roofing and exterior maintenance. Licensed, insured, and certified. Free estimates on all work.",
    "Interior renovation expert. Painting, drywall, flooring - we do it all. Quality craftsmanship guaranteed.",
    "Licensed electrician specializing in vacant property repairs. Safety inspections and code compliance.",
    "Professional locksmith services. Rekeying, lock changes, and access solutions for property management.",
  ];

  for (let i = 0; i < contractors.length; i++) {
    const c = contractors[i];
    const addr = getContractorAddress(i);
    try {
      await prisma.contractorProfile.upsert({
        where: { userId: c.id },
        update: {},
        create: {
          userId: c.id,
          completedJobs: randInt(5, 150),
          totalJobs: randInt(10, 200),
          avgRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
          totalRatings: randInt(3, 50),
          reliabilityScore: Math.round((70 + Math.random() * 30) * 10) / 10,
          responseTime: randInt(5, 120),
          bio: bios[i % bios.length],
          skills: skillSets[i % skillSets.length],
          specialties: pickN(["Grass Cut", "Board Up", "Winterization", "Debris Removal", "Inspection", "Mold", "Roofing", "Plumbing", "Electrical", "Painting"], randInt(2, 4)),
          serviceRadius: pick([25, 50, 75, 100]),
          isAvailable: Math.random() > 0.2,
          hourlyRate: pick([35, 45, 55, 65, 75, 85]),
          address: addr.address,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          latitude: addr.latitude,
          longitude: addr.longitude,
        },
      });
    } catch {}
  }
  console.log(`  ✅ ${contractors.length} contractor profiles created`);

  // ═══════════════════════════════════════════════════════════════════
  // NETWORK POSTS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating network posts...");

  const postData = [
    // GENERAL posts
    { title: "Welcome to the Contractor Network!", content: "Hey everyone! Excited to launch our new contractor collaboration platform. This is where we can share tips, find job coverage, and support each other. Let's build something great together! 💪", category: "GENERAL", daysAgo: 14, author: admin },
    { title: "Best practices for photo documentation", content: "After reviewing hundreds of work orders, here are the top photo tips:\n\n1. Always take a wide shot first\n2. Include a close-up of any damage\n3. Make sure timestamps are visible\n4. Use good lighting - no dark photos!\n5. Capture all 4 sides of the property\n\nQuality photos = faster QC approval = faster payment! 📸", category: "GENERAL", daysAgo: 10, author: coordinators[0] },
    { title: "New GPS camera feature launched!", content: "We just rolled out GPS-tagged photos! Now when you take photos through the app, they'll automatically include location data. This helps us verify property visits and reduces disputes. Check it out in the Camera section.", category: "ANNOUNCEMENT", daysAgo: 7, author: admin },
    { title: "Tips for working in extreme heat", content: "With summer approaching, remember:\n\n☀️ Start early (6-7am) to avoid peak heat\n💧 Bring plenty of water\n🧴 Wear sunscreen\n👕 Light, breathable clothing\n🚗 Keep your vehicle AC running\n\nYour health comes first. If it's too hot, reschedule. No job is worth heatstroke.", category: "GENERAL", daysAgo: 5, author: coordinators[1] },
    { title: "Shoutout to our top contractors this month!", content: "🎉 Congratulations to our top performers:\n\n🥇 Contractor Mike - 42 completed jobs, 4.9 avg rating\n🥈 Contractor Sarah - 38 completed jobs, 4.8 avg rating\n🥉 Contractor James - 35 completed jobs, 4.9 avg rating\n\nKeep up the amazing work!", category: "ANNOUNCEMENT", daysAgo: 3, author: admin },

    // WORK_RELATED posts
    { title: "Grass cut pricing update for Q2", content: "Heads up - we've updated our grass cut pricing for the summer season. Standard residential is now $45 (was $40). Large properties over 1 acre start at $75. Updated rate cards are in the system.", category: "WORK_RELATED", daysAgo: 8, author: coordinators[0] },
    { title: "New winterization checklist in effect", content: "Starting November 1st, all winterization jobs must follow the updated checklist. Key changes:\n\n- Must photograph water meter reading\n- All faucets must be documented open AND closed\n- Anti-freeze concentration must be tested\n- New 'heat tape' section for pipes in unheated areas\n\nFull checklist available in Training.", category: "WORK_RELATED", daysAgo: 12, author: processors[0] },
    { title: "QC rejection reasons - top 5 this month", content: "To help everyone pass QC on the first try, here are the top rejection reasons:\n\n1. Photos too dark / blurry (38%)\n2. Missing 'after' photos (22%)\n3. Incomplete task checklist (18%)\n4. Wrong property photos (12%)\n5. Debris not fully removed (10%)\n\nLet's work on getting these numbers down! 💪", category: "WORK_RELATED", daysAgo: 6, author: processors[1] },

    // HELP_NEEDED posts
    { title: "Need coverage in Columbus, OH - 3 grass cuts", content: "I have 3 grass cuts in Columbus that I can't get to this week. All simple residential jobs, about 30 min each. Pay is $45 each. Anyone available?", category: "HELP_NEEDED", daysAgo: 4, city: "Columbus", state: "OH", author: contractors[0] },
    { title: "Looking for board-up contractor in Detroit area", content: "Urgent need for a reliable board-up contractor in Detroit. We have 5 properties that need securing ASAP. Budget is $200-350 per property depending on size. Must have own tools and materials.", category: "HELP_NEEDED", daysAgo: 2, city: "Detroit", state: "MI", isUrgent: true, author: coordinators[2] },
    { title: "Anyone available for emergency winterization in Indiana?", content: "Forecast shows a cold snap hitting Indiana next week. We need contractors who can handle emergency winterizations in the Indianapolis and Fort Wayne areas. Good pay, quick turnaround needed.", category: "HELP_NEEDED", daysAgo: 1, city: "Indianapolis", state: "IN", isUrgent: true, author: coordinators[0] },
    { title: "Need someone with mold remediation experience", content: "Found black mold during an inspection in Springfield, IL. Need a certified mold remediation contractor. This is a larger job - probably 2-3 days. Must have IICRC certification.", category: "HELP_NEEDED", daysAgo: 3, city: "Springfield", state: "IL", author: coordinators[1] },

    // URGENT posts
    { title: "🚨 Emergency: Vandalism at multiple Detroit properties", content: "We've received reports of vandalism at 4 properties in the Detroit area. Windows broken, doors kicked in. Need board-up contractors immediately. These are priority 1 jobs. Call dispatch at (555) 911-0001.", category: "URGENT", daysAgo: 1, city: "Detroit", state: "MI", isUrgent: true, author: admin },
    { title: "⚠️ Pipe burst at 567 River Lane, Columbus", content: "Water main break reported at 567 River Lane, Columbus OH 43215. Water is flowing into the basement. Need a plumber on site ASAP. Lock code: 5678. Client has been notified.", category: "URGENT", daysAgo: 1, city: "Columbus", state: "OH", isUrgent: true, author: coordinators[2] },

    // JOB_COVERAGE posts
    { title: "Available for grass cuts in Naperville/Joliet area", content: "I have open availability next week (Mon-Wed) for grass cuts in the Naperville, Joliet, and Bolingbrook areas. Can handle 8-10 jobs per day. Equipment ready. Assign me! ✅", category: "JOB_COVERAGE", daysAgo: 5, city: "Naperville", state: "IL", author: contractors[2] },
    { title: "Coverage available: All services in Nashville, TN", content: "My team is fully staffed and available for any service type in the Nashville metro area. We handle grass cuts, debris removal, winterization, board-ups, and inspections. 15+ years experience.", category: "JOB_COVERAGE", daysAgo: 3, city: "Nashville", state: "TN", author: contractors[5] },
    { title: "Looking for work in Houston area", content: "Licensed contractor available in Houston and surrounding areas. Specializing in debris removal and property cleanouts. Have dump trailer and all necessary equipment. Competitive rates.", category: "JOB_COVERAGE", daysAgo: 2, city: "Houston", state: "TX", author: contractors[10] },
    { title: "Board-up specialist available in Atlanta", content: "Experienced board-up contractor available in the greater Atlanta area. Can respond within 2 hours for emergency board-ups. Own materials and tools. Insured for $2M.", category: "JOB_COVERAGE", daysAgo: 1, city: "Atlanta", state: "GA", author: contractors[15] },
  ];

  const posts: any[] = [];
  for (const pd of postData) {
    const post = await prisma.post.create({
      data: {
        title: pd.title,
        content: pd.content,
        category: pd.category as any,
        authorId: pd.author.id,
        city: pd.city || null,
        state: pd.state || null,
        isUrgent: pd.isUrgent || false,
        tags: pd.category === "HELP_NEEDED" ? ["help-wanted"] : pd.category === "URGENT" ? ["urgent"] : [],
        createdAt: daysFromNow(-pd.daysAgo),
      },
    });
    posts.push(post);
  }
  console.log(`  ✅ ${posts.length} network posts created`);

  // ═══════════════════════════════════════════════════════════════════
  // POST COMMENTS & REACTIONS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating post comments and reactions...");

  const commentTexts = [
    "Great post! Thanks for sharing.",
    "I can help with this. DM me!",
    "How much does this pay?",
    "I'm available. What's the address?",
    "Thanks for the update. Very helpful.",
    "Can you provide more details?",
    "I've done similar work before. Happy to help.",
    "This is exactly what I needed to hear.",
    "Bookmarking this for later.",
    "Anyone else having this issue?",
    "I second this. Quality over speed.",
    "Nice work! Keep it up. 👍",
    "When is the deadline?",
    "Is this still available?",
    "I'm in the area. Count me in.",
    "Great tip! I'll implement this immediately.",
    "Can we get more jobs like this?",
    "The updated checklist is much better.",
    "Totally agree. Safety first.",
    "This happened to me last month too.",
  ];

  const reactionTypes = ["LIKE", "HELPFUL", "LOVE", "THUMBS_UP"];

  let commentCount = 0;
  let reactionCount = 0;

  for (const post of posts) {
    // Add comments
    const numComments = randInt(2, 6);
    for (let i = 0; i < numComments; i++) {
      const author = pick([...contractors, ...coordinators, ...processors]);
      try {
        const comment = await prisma.postComment.create({
          data: {
            content: pick(commentTexts),
            postId: post.id,
            authorId: author.id,
            createdAt: daysFromNow(-randInt(0, 5)),
          },
        });
        commentCount++;

        // Some replies to comments
        if (Math.random() > 0.6) {
          const replyAuthor = pick([...contractors, ...coordinators]);
          await prisma.postComment.create({
            data: {
              content: pick(["Thanks!", "Got it.", "Appreciate the response.", "Will do!", "Sounds good.", "Perfect, thanks!"]),
              postId: post.id,
              authorId: replyAuthor.id,
              parentId: comment.id,
              createdAt: daysFromNow(-randInt(0, 3)),
            },
          });
          commentCount++;
        }
      } catch {}
    }

    // Add reactions
    const numReactions = randInt(3, 10);
    const reactors = pickN([...contractors, ...coordinators, ...processors, ...clients], numReactions);
    for (const reactor of reactors) {
      try {
        await prisma.postReaction.create({
          data: {
            postId: post.id,
            userId: reactor.id,
            type: pick(reactionTypes as any),
          },
        });
        reactionCount++;
      } catch {}
    }
  }

  console.log(`  ✅ ${commentCount} comments and ${reactionCount} reactions created`);

  // ═══════════════════════════════════════════════════════════════════
  // JOB REQUESTS & OFFERS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating job requests and offers...");

  const jobPosts = posts.filter(p => p.category === "HELP_NEEDED" || p.category === "JOB_COVERAGE");
  let jobReqCount = 0;
  let jobOffCount = 0;

  for (const post of jobPosts.slice(0, 6)) {
    try {
      const jr = await prisma.jobRequest.create({
        data: {
          postId: post.id,
          requesterId: post.authorId,
          scopeOfWork: post.content,
          budget: pick([150, 200, 300, 450, 600, 800]),
          deadline: daysFromNow(randInt(3, 14)),
          urgency: pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as any),
          location: `${post.city || "Various"}, ${post.state || "US"}`,
          city: post.city,
          state: post.state,
        },
      });
      jobReqCount++;

      // Add offers
      const numOffers = randInt(1, 4);
      const offerors = pickN(contractors, numOffers);
      for (const offeror of offerors) {
        try {
          await prisma.jobOffer.create({
            data: {
              jobRequestId: jr.id,
              offerorId: offeror.id,
              message: pick([
                "I can handle this job. Available this week.",
                "I'm in the area and have all the equipment needed.",
                "Experienced with this type of work. Fast turnaround.",
                "I can do it for the listed budget. When do you need it done?",
                "Available immediately. Can start tomorrow morning.",
              ]),
              proposedBudget: pick([130, 180, 250, 400, 550, 700]),
              proposedDeadline: daysFromNow(randInt(2, 10)),
            },
          });
          jobOffCount++;
        } catch {}
      }
    } catch {}
  }

  console.log(`  ✅ ${jobReqCount} job requests and ${jobOffCount} offers created`);

  // ═══════════════════════════════════════════════════════════════════
  // RATINGS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating ratings...");

  let ratingCount = 0;
  const ratingComments = [
    "Excellent work! Very professional and thorough.",
    "Great quality, fast turnaround. Will use again.",
    "Good work overall. Minor issues with photos but fixed quickly.",
    "Outstanding contractor! Went above and beyond.",
    "Solid work. Reliable and communicative.",
    "Very impressed with the attention to detail.",
    "Good job. Completed on time and within budget.",
    "Professional service. Property looked great after.",
    "Quick response and quality work. Highly recommend.",
    "Dependable contractor. Always delivers quality results.",
  ];

  for (const contractor of contractors.slice(0, 20)) {
    const numRatings = randInt(2, 6);
    const raters = pickN([...coordinators, ...clients, ...processors], numRatings);
    for (const rater of raters) {
      try {
        const wo = pick(workOrders);
        await prisma.rating.create({
          data: {
            ratedId: contractor.id,
            raterId: rater.id,
            workOrderId: wo.id,
            score: pick([3, 4, 4, 5, 5, 5]),
            comment: pick(ratingComments),
            punctuality: pick([3, 4, 4, 5, 5]),
            quality: pick([3, 4, 4, 5, 5, 5]),
            communication: pick([3, 4, 4, 5, 5]),
          },
        });
        ratingCount++;
      } catch {}
    }
  }

  console.log(`  ✅ ${ratingCount} ratings created`);

  // ═══════════════════════════════════════════════════════════════════
  // CONTRACTOR BADGES
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating contractor badges...");

  const badgeTypes = [
    { type: "TOP_VENDOR", label: "Top Vendor", desc: "Consistently high ratings and reliability" },
    { type: "FAST_RESPONDER", label: "Fast Responder", desc: "Average response time under 30 minutes" },
    { type: "TRUSTED", label: "Trusted", desc: "Verified and trusted by multiple clients" },
    { type: "RISING_STAR", label: "Rising Star", desc: "New contractor with exceptional performance" },
    { type: "QUALITY_WORK", label: "Quality Work", desc: "4.5+ average quality rating" },
    { type: "FIVE_STAR", label: "5-Star", desc: "Perfect 5.0 overall rating" },
    { type: "COMPLETED_10", label: "10 Jobs Done", desc: "Completed 10 or more jobs" },
    { type: "COMPLETED_50", label: "50 Jobs Done", desc: "Completed 50 or more jobs" },
    { type: "COMPLETED_100", label: "100 Jobs Done", desc: "Completed 100 or more jobs" },
  ];

  let badgeCount = 0;
  for (const contractor of contractors.slice(0, 15)) {
    const profile = await prisma.contractorProfile.findUnique({ where: { userId: contractor.id } });
    if (!profile) continue;
    const numBadges = randInt(1, 4);
    const badges = pickN(badgeTypes, numBadges);
    for (const badge of badges) {
      try {
        await prisma.contractorBadge.create({
          data: {
            profileId: profile.id,
            type: badge.type as any,
            label: badge.label,
            description: badge.desc,
            earnedAt: daysFromNow(-randInt(1, 60)),
          },
        });
        badgeCount++;
      } catch {}
    }
  }

  console.log(`  ✅ ${badgeCount} badges created`);

  // ═══════════════════════════════════════════════════════════════════
  // INSPECTORS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating inspectors...");

  const inspectorData = [
    { name: "Mike's Inspection Services", specialty: "GENERAL", city: "Springfield", state: "IL", rate: 150 },
    { name: "ProPlumb Inspections", specialty: "PLUMBER", city: "Columbus", state: "OH", rate: 175 },
    { name: "SafeWire Electric", specialty: "ELECTRICIAN", city: "Indianapolis", state: "IN", rate: 165 },
    { name: "CoolAir HVAC Services", specialty: "HVAC", city: "Detroit", state: "MI", rate: 180 },
    { name: "TopNotch Roofing Inspectors", specialty: "ROOFER", city: "Nashville", state: "TN", rate: 200 },
    { name: "BugFree Pest Control", specialty: "PEST_CONTROL", city: "Atlanta", state: "GA", rate: 125 },
    { name: "Structural Solutions Inc", specialty: "STRUCTURAL", city: "Houston", state: "TX", rate: 225 },
    { name: "EcoCheck Environmental", specialty: "ENVIRONMENTAL", city: "Denver", state: "CO", rate: 195 },
    { name: "Septic Pro Services", specialty: "SEPTIC", city: "Charlotte", state: "NC", rate: 175 },
    { name: "AquaTest Well Inspections", specialty: "WELL", city: "Raleigh", state: "NC", rate: 150 },
    { name: "PoolSafe Inspections", specialty: "POOL", city: "Phoenix", state: "AZ", rate: 140 },
    { name: "FireGuard Safety", specialty: "FIRE_SAFETY", city: "Dallas", state: "TX", rate: 190 },
  ];

  for (const insp of inspectorData) {
    try {
      await prisma.inspector.create({
        data: {
          name: insp.name,
          email: `${insp.name.toLowerCase().replace(/[^a-z]/g, "")}@inspect.com`,
          phone: `(555) ${randInt(100, 999)}-${randInt(1000, 9999)}`,
          company: insp.name,
          bio: `Professional ${insp.specialty.toLowerCase().replace(/_/g, " ")} inspector with ${randInt(5, 20)} years experience.`,
          city: insp.city,
          state: insp.state,
          availability: pick(["AVAILABLE", "AVAILABLE", "AVAILABLE", "BUSY"]),
          rating: Math.round((4.0 + Math.random()) * 10) / 10,
          reviewCount: randInt(5, 50),
          hourlyRate: insp.rate,
          specialties: {
            create: {
              specialty: insp.specialty as any,
              yearsExp: randInt(5, 20),
              certified: true,
            },
          },
        },
      });
    } catch {}
  }

  console.log(`  ✅ ${inspectorData.length} inspectors created`);

  // ═══════════════════════════════════════════════════════════════════
  // DISPUTES
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating disputes...");

  const disputeData = [
    { title: "Incomplete grass cut", desc: "Contractor claimed job was done but photos show grass still overgrown in back yard.", status: "OPEN", priority: "MEDIUM" },
    { title: "Property damage during board-up", desc: "Door frame was damaged during board-up installation. Client requesting repair.", status: "UNDER_REVIEW", priority: "HIGH" },
    { title: "Wrong property serviced", desc: "Contractor went to wrong address and performed work on occupied property.", status: "OPEN", priority: "URGENT" },
    { title: "Overcharging dispute", desc: "Client claims invoice amount is 2x higher than quoted. Needs review.", status: "RESOLVED", priority: "MEDIUM", resolution: "Reviewed pricing with contractor. Adjusted invoice to match original quote. Credit issued." },
    { title: "Late completion", desc: "Winterization was supposed to be done by Nov 15. Contractor completed on Dec 2.", status: "CLOSED", priority: "LOW", resolution: "Contractor explained weather delay. Client accepted explanation." },
  ];

  for (const dd of disputeData) {
    try {
      const wo = pick(workOrders);
      const raisedBy = pick([...clients, ...coordinators]);
      await prisma.dispute.create({
        data: {
          workOrderId: wo.id,
          raisedById: raisedBy.id,
          assignedToId: admin.id,
          title: dd.title,
          description: dd.desc,
          status: dd.status,
          priority: dd.priority,
          resolution: dd.resolution || null,
        },
      });
    } catch {}
  }

  console.log(`  ✅ ${disputeData.length} disputes created`);

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating notifications...");

  const notifData = [
    { title: "New work order assigned", message: "You have been assigned a new grass cut at 123 Oak Street.", type: "WORK_ORDER", daysAgo: 1 },
    { title: "Invoice paid", message: "Invoice INV-000001 has been marked as paid. $450.00 credited.", type: "INVOICE", daysAgo: 2 },
    { title: "QC Revision needed", message: "Photos for WO at 456 Maple Ave need retakes. Too dark to verify.", type: "WORK_ORDER", daysAgo: 3 },
    { title: "New message from coordinator", message: "Sarah left a comment on your work order: 'Please resubmit with better photos.'", type: "MESSAGE", daysAgo: 1 },
    { title: "Payment processed", message: "Your withdrawal of $1,250.00 has been processed. Expect 2-3 business days.", type: "PAYMENT", daysAgo: 4 },
    { title: "New network post", message: "Mike posted: 'Available for grass cuts in Naperville/Joliet area'", type: "NETWORK", daysAgo: 1 },
    { title: "Work order completed", message: "WO at 789 Pine Road has been marked as completed by contractor.", type: "WORK_ORDER", daysAgo: 2 },
    { title: "Dispute update", message: "Your dispute 'Incomplete grass cut' has been assigned for review.", type: "DISPUTE", daysAgo: 1 },
    { title: "New job offer received", message: "Contractor James submitted a bid for your board-up request.", type: "JOB", daysAgo: 1 },
    { title: "Rating received", message: "You received a 5-star rating from Davis Real Estate Group!", type: "RATING", daysAgo: 2 },
  ];

  const allUsers = await prisma.user.findMany({ take: 20 });
  let notifCount = 0;

  for (const user of allUsers) {
    const numNotifs = randInt(3, 6);
    const notifs = pickN(notifData, numNotifs);
    for (const n of notifs) {
      try {
        await prisma.notification.create({
          data: {
            title: n.title,
            message: n.message,
            type: n.type,
            userId: user.id,
            isRead: Math.random() > 0.5,
            createdAt: daysFromNow(-n.daysAgo),
          },
        });
        notifCount++;
      } catch {}
    }
  }

  console.log(`  ✅ ${notifCount} notifications created`);

  // ═══════════════════════════════════════════════════════════════════
  // WITHDRAWALS
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating withdrawals...");

  let wdCount = 0;
  for (const contractor of contractors.slice(0, 8)) {
    const numWd = randInt(1, 3);
    for (let i = 0; i < numWd; i++) {
      try {
        await prisma.withdrawal.create({
          data: {
            contractorId: contractor.id,
            amount: pick([250, 500, 750, 1000, 1500, 2000]),
            method: pick(["ACH", "WIRE", "PAYPAL", "ZELLE", "CHECK"]),
            status: pick(["PENDING", "PROCESSING", "COMPLETED", "COMPLETED", "COMPLETED"]),
            completedAt: Math.random() > 0.4 ? daysFromNow(-randInt(1, 14)) : null,
            createdAt: daysFromNow(-randInt(1, 30)),
          },
        });
        wdCount++;
      } catch {}
    }
  }

  console.log(`  ✅ ${wdCount} withdrawals created`);

  // ═══════════════════════════════════════════════════════════════════
  // VOICE PROFILES
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Creating voice profiles...");

  const voiceData = [
    { name: "Professional Male", desc: "Clear, professional male voice for business calls" },
    { name: "Friendly Female", desc: "Warm, approachable female voice for client calls" },
    { name: "Authoritative", desc: "Deep, authoritative voice for urgent matters" },
  ];

  for (const vd of voiceData) {
    try {
      await prisma.voiceProfile.create({
        data: {
          userId: admin.id,
          name: vd.name,
          description: vd.desc,
          voiceId: `mock-voice-${vd.name.toLowerCase().replace(/\s/g, "-")}`,
          stability: 0.7,
          clarity: 0.8,
          style: 0.3,
        },
      });
    } catch {}
  }

  console.log(`  ✅ ${voiceData.length} voice profiles created`);

  // ═══════════════════════════════════════════════════════════════════
  // MORE REALISTIC CHAT MESSAGES (add to existing channels)
  // ═══════════════════════════════════════════════════════════════════
  console.log("  Adding more realistic chat messages...");

  const channels = await prisma.channel.findMany({ where: { type: { not: "DIRECT_MESSAGE" } } });
  const generalChannel = channels.find(c => c.name === "general");
  const workOrderChannel = channels.find(c => c.name === "work-orders");

  if (generalChannel) {
    const recentMessages = [
      { author: admin, content: "📢 Company picnic is next Saturday at Lincoln Park! RSVP by Wednesday. Families welcome!", hoursAgo: 48 },
      { author: coordinators[0], content: "Reminder: All Q4 expense reports are due by end of month. Please submit through the accounting portal.", hoursAgo: 36 },
      { author: processors[0], content: "The new photo compression is saving us about 40% on storage. Good call on that implementation.", hoursAgo: 24 },
      { author: admin, content: "🎉 We just hit 1,000 completed work orders this quarter! Great job team!", hoursAgo: 12 },
      { author: coordinators[1], content: "Who's handling the new client onboarding for Metro Asset Management? I need to sync with them.", hoursAgo: 6 },
      { author: admin, content: "I'll handle it. Sending you the details now.", hoursAgo: 5 },
    ];

    for (const msg of recentMessages) {
      try {
        await prisma.chatMessage.create({
          data: {
            content: msg.content,
            channelId: generalChannel.id,
            authorId: msg.author.id,
            createdAt: new Date(Date.now() - msg.hoursAgo * 60 * 60 * 1000),
          },
        });
      } catch {}
    }
  }

  console.log("  ✅ Additional chat messages added");

  console.log("\n🎉 Network seed completed!");
  console.log(`  Posts: ${posts.length}`);
  console.log(`  Comments: ${commentCount}`);
  console.log(`  Reactions: ${reactionCount}`);
  console.log(`  Job Requests: ${jobReqCount}`);
  console.log(`  Job Offers: ${jobOffCount}`);
  console.log(`  Ratings: ${ratingCount}`);
  console.log(`  Badges: ${badgeCount}`);
  console.log(`  Inspectors: ${inspectorData.length}`);
  console.log(`  Disputes: ${disputeData.length}`);
  console.log(`  Notifications: ${notifCount}`);
  console.log(`  Withdrawals: ${wdCount}`);
  console.log(`  Voice Profiles: ${voiceData.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
