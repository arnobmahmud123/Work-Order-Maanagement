import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

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

async function main() {
  console.log("🌱 Seeding contractor addresses...");

  const contractors = await prisma.user.findMany({
    where: { role: "CONTRACTOR" },
    include: { contractorProfile: true },
  });

  console.log(`  Found ${contractors.length} contractors`);

  let updated = 0;
  for (let i = 0; i < contractors.length; i++) {
    const c = contractors[i];
    const addr = CONTRACTOR_ADDRESSES[i % CONTRACTOR_ADDRESSES.length];

    if (c.contractorProfile) {
      await prisma.contractorProfile.update({
        where: { userId: c.id },
        data: {
          address: addr.address,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          latitude: addr.latitude,
          longitude: addr.longitude,
        },
      });
      updated++;
    } else {
      await prisma.contractorProfile.create({
        data: {
          userId: c.id,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          latitude: addr.latitude,
          longitude: addr.longitude,
        },
      });
      updated++;
    }
  }

  console.log(`  ✅ ${updated} contractor addresses updated`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
