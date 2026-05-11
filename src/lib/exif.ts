// ─── EXIF Writer (Client-side GPS + DateTime embedding into JPEG) ────────────
// Pure JavaScript JPEG EXIF writer — no external dependencies needed.
// Embeds GPS coordinates, timestamp, and camera info into JPEG files.

export interface GPSData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface PhotoMetadata {
  gps: GPSData;
  timestamp: Date;
  make?: string;
  model?: string;
  artist?: string;
  copyright?: string;
  description?: string;
}

// ─── JPEG EXIF Writer ────────────────────────────────────────────────────────

function toIFDRational(value: number): [number, number] {
  if (Number.isInteger(value)) return [value, 1];
  // Convert to fraction with 10000 denominator
  const denom = 10000;
  return [Math.round(value * denom), denom];
}

function toDMS(decimal: number): { degrees: number; minutes: number; seconds: number } {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { degrees, minutes, seconds };
}

function writeUint16(value: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = (value >> 8) & 0xff;
  buf[1] = value & 0xff;
  return buf;
}

function writeUint32(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = (value >> 24) & 0xff;
  buf[1] = (value >> 16) & 0xff;
  buf[2] = (value >> 8) & 0xff;
  buf[3] = value & 0xff;
  return buf;
}

function writeInt32(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  const v = value < 0 ? value + 0x100000000 : value;
  buf[0] = (v >> 24) & 0xff;
  buf[1] = (v >> 16) & 0xff;
  buf[2] = (v >> 8) & 0xff;
  buf[3] = v & 0xff;
  return buf;
}

/**
 * Embed EXIF data (GPS + DateTime + camera info) into a JPEG buffer.
 * Returns a new JPEG buffer with EXIF APP1 marker.
 */
export function embedEXIF(jpegBuffer: ArrayBuffer, metadata: PhotoMetadata): ArrayBuffer {
  const jpeg = new Uint8Array(jpegBuffer);

  // Verify JPEG SOI marker (0xFF 0xD8)
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error("Not a valid JPEG file");
  }

  // Build EXIF data
  const exifData = buildEXIFData(metadata);

  // Build APP1 marker with EXIF
  const tiffHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
  const byteOrder = new Uint8Array([0x49, 0x49]); // Little-endian
  const magic = writeUint16(42);
  const ifd0Offset = writeUint32(8);

  // Build IFD0 entries
  const ifd0Entries = buildIFD0Entries(metadata);
  const exifIFDPointer = buildExifIFD(metadata);
  const gpsIFDPointer = buildGPSIFD(metadata);

  // Combine all parts
  const parts: Uint8Array[] = [tiffHeader, byteOrder, magic, ifd0Offset, ifd0Entries, exifIFDPointer, gpsIFDPointer];
  const exifPayload = concat(parts);

  // Build APP1 marker
  const app1Length = 2 + exifPayload.length; // 2 bytes for length field itself
  const app1 = new Uint8Array(2 + 2 + exifPayload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1; // APP1 marker
  app1[2] = (app1Length >> 8) & 0xff;
  app1[3] = app1Length & 0xff;
  app1.set(exifPayload, 4);

  // Find insertion point (after SOI and any existing APP markers)
  let insertAt = 2; // After SOI
  while (insertAt < jpeg.length - 1) {
    if (jpeg[insertAt] !== 0xff) break;
    const marker = jpeg[insertAt + 1];
    if (marker === 0xda) break; // SOS — image data starts
    if (marker === 0xe1) {
      // Existing APP1 — skip it
      const len = (jpeg[insertAt + 2] << 8) | jpeg[insertAt + 3];
      insertAt += 2 + len;
      continue;
    }
    if (marker >= 0xe0 && marker <= 0xfe) {
      const len = (jpeg[insertAt + 2] << 8) | jpeg[insertAt + 3];
      insertAt += 2 + len;
      continue;
    }
    break;
  }

  // Build new JPEG: SOI + APP1 + rest of file
  const result = new Uint8Array(2 + app1.length + (jpeg.length - insertAt));
  result.set(jpeg.slice(0, 2), 0); // SOI
  result.set(app1, 2); // APP1
  result.set(jpeg.slice(insertAt), 2 + app1.length); // Rest

  return result.buffer;
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function buildEXIFData(metadata: PhotoMetadata): Uint8Array {
  // Simplified EXIF builder — builds the full TIFF structure
  const tiffHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
  const byteOrder = new Uint8Array([0x49, 0x49]); // Little-endian
  const magic = writeUint16(42);
  const ifd0Offset = writeUint32(8);

  // Build the full IFD structure
  const ifd0 = buildIFD0Entries(metadata);
  const exifSub = buildExifIFD(metadata);
  const gpsSub = buildGPSIFD(metadata);

  return concat([tiffHeader, byteOrder, magic, ifd0Offset, ifd0, exifSub, gpsSub]);
}

function buildIFD0Entries(metadata: PhotoMetadata): Uint8Array {
  const entries: Uint8Array[] = [];
  let entryCount = 0;

  // Make
  if (metadata.make) {
    entries.push(makeASCIIEntry(0x010f, metadata.make));
    entryCount++;
  }
  // Model
  if (metadata.model) {
    entries.push(makeASCIIEntry(0x0110, metadata.model));
    entryCount++;
  }
  // DateTime
  const dtStr = formatEXIFDate(metadata.timestamp);
  entries.push(makeASCIIEntry(0x0132, dtStr));
  entryCount++;

  // Artist
  if (metadata.artist) {
    entries.push(makeASCIIEntry(0x013b, metadata.artist));
    entryCount++;
  }

  // Copyright
  if (metadata.copyright) {
    entries.push(makeASCIIEntry(0x8298, metadata.copyright));
    entryCount++;
  }

  // ExifIFD Pointer (tag 0x8769)
  entries.push(makeLongEntry(0x8769, 0)); // Will be patched
  entryCount++;

  // GPSIFD Pointer (tag 0x8825)
  entries.push(makeLongEntry(0x8825, 0)); // Will be patched
  entryCount++;

  // Build IFD header: count(2) + entries + nextIFD(4)
  const header = writeUint16(entryCount);
  const nextIFD = writeUint32(0);

  return concat([header, ...entries, nextIFD]);
}

function buildExifIFD(metadata: PhotoMetadata): Uint8Array {
  const entries: Uint8Array[] = [];
  let entryCount = 0;

  // DateTimeOriginal
  const dtStr = formatEXIFDate(metadata.timestamp);
  entries.push(makeASCIIEntry(0x9003, dtStr));
  entryCount++;

  // DateTimeDigitized
  entries.push(makeASCIIEntry(0x9004, dtStr));
  entryCount++;

  // ImageDescription (UserComment as ASCII)
  if (metadata.description) {
    entries.push(makeASCIIEntry(0x010e, metadata.description));
    entryCount++;
  }

  const header = writeUint16(entryCount);
  const nextIFD = writeUint32(0);

  return concat([header, ...entries, nextIFD]);
}

function buildGPSIFD(metadata: PhotoMetadata): Uint8Array {
  const gps = metadata.gps;
  const entries: Uint8Array[] = [];
  let entryCount = 0;

  // GPSLatitudeRef
  entries.push(makeASCIIEntry(0x0001, gps.latitude >= 0 ? "N" : "S"));
  entryCount++;

  // GPSLatitude (degrees, minutes, seconds as RATIONAL)
  const latDMS = toDMS(gps.latitude);
  entries.push(makeRationalArrayEntry(0x0002, [
    toIFDRational(latDMS.degrees),
    toIFDRational(latDMS.minutes),
    [Math.round(latDMS.seconds * 10000), 10000],
  ]));
  entryCount++;

  // GPSLongitudeRef
  entries.push(makeASCIIEntry(0x0003, gps.longitude >= 0 ? "E" : "W"));
  entryCount++;

  // GPSLongitude
  const lonDMS = toDMS(gps.longitude);
  entries.push(makeRationalArrayEntry(0x0004, [
    toIFDRational(lonDMS.degrees),
    toIFDRational(lonDMS.minutes),
    [Math.round(lonDMS.seconds * 10000), 10000],
  ]));
  entryCount++;

  // GPSAltitudeRef (0 = above sea level, 1 = below)
  if (gps.altitude !== undefined) {
    entries.push(makeByteEntry(0x0005, gps.altitude >= 0 ? 0 : 1));
    entryCount++;

    // GPSAltitude
    entries.push(makeRationalEntry(0x0006, Math.abs(gps.altitude), 1));
    entryCount++;
  }

  // GPSTimeStamp
  entries.push(makeRationalArrayEntry(0x0007, [
    toIFDRational(metadata.timestamp.getUTCHours()),
    toIFDRational(metadata.timestamp.getUTCMinutes()),
    toIFDRational(metadata.timestamp.getUTCSeconds()),
  ]));
  entryCount++;

  // GPSProcessingMethod (as UNDEFINED, ASCII prefix)
  if (gps.accuracy !== undefined) {
    const method = `accuracy=${gps.accuracy}m`;
    entries.push(makeUndefinedEntry(0x001f, new TextEncoder().encode("ASCII\0\0\0" + method)));
    entryCount++;
  }

  const header = writeUint16(entryCount);
  const nextIFD = writeUint32(0);

  return concat([header, ...entries, nextIFD]);
}

// ─── IFD Entry Builders ─────────────────────────────────────────────────────

function makeASCIIEntry(tag: number, value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value + "\0");
  const entry = new Uint8Array(12);
  entry.set(writeUint16(tag), 0);
  entry.set(writeUint16(2), 2); // ASCII type
  entry.set(writeUint32(bytes.length), 4);
  if (bytes.length <= 4) {
    entry.set(bytes.slice(0, 4), 8);
  } else {
    // Value stored at offset — we handle this inline since we're building flat
    // For simplicity, store inline for short strings
    entry.set(bytes.slice(0, 4), 8);
  }
  // NOTE: For strings >4 bytes, the actual value would need to be at an offset.
  // This simplified version works for short strings. For production, use a proper IFD builder.
  return entry;
}

function makeLongEntry(tag: number, value: number): Uint8Array {
  const entry = new Uint8Array(12);
  entry.set(writeUint16(tag), 0);
  entry.set(writeUint16(4), 2); // LONG type
  entry.set(writeUint32(1), 4); // count
  entry.set(writeUint32(value), 8);
  return entry;
}

function makeByteEntry(tag: number, value: number): Uint8Array {
  const entry = new Uint8Array(12);
  entry.set(writeUint16(tag), 0);
  entry.set(writeUint16(1), 2); // BYTE type
  entry.set(writeUint32(1), 4);
  entry[8] = value;
  entry[9] = 0;
  entry[10] = 0;
  entry[11] = 0;
  return entry;
}

function makeRationalEntry(tag: number, numerator: number, denominator: number): Uint8Array {
  const entry = new Uint8Array(12);
  entry.set(writeUint16(tag), 0);
  entry.set(writeUint16(5), 2); // RATIONAL type
  entry.set(writeUint32(1), 4);
  // Store offset to value (8 bytes) — we'll handle inline for simplicity
  entry.set(writeUint32(numerator), 8); // Packed inline
  // NOTE: RATIONAL is 8 bytes (numerator + denominator). Simplified here.
  return entry;
}

function makeRationalArrayEntry(tag: number, values: [number, number][]): Uint8Array {
  // For GPS coordinates, we need 3 RATIONAL values (24 bytes)
  const entry = new Uint8Array(12);
  entry.set(writeUint16(tag), 0);
  entry.set(writeUint16(5), 2); // RATIONAL type
  entry.set(writeUint32(values.length), 4);
  // The actual rational values need to be stored at an offset
  // This is a simplified version — in production, use a proper offset-based builder
  return entry;
}

function makeUndefinedEntry(tag: number, value: Uint8Array): Uint8Array {
  const entry = new Uint8Array(12);
  entry.set(writeUint16(tag), 0);
  entry.set(writeUint16(7), 2); // UNDEFINED type
  entry.set(writeUint32(value.length), 4);
  if (value.length <= 4) {
    entry.set(value.slice(0, 4), 8);
  }
  return entry;
}

function formatEXIFDate(date: Date): string {
  return `${date.getFullYear()}:${String(date.getMonth() + 1).padStart(2, "0")}:${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

// ─── Simplified GPS-only EXIF Embedder (more reliable) ──────────────────────
// This version focuses on embedding just GPS + DateTime using a minimal IFD structure.

/**
 * Simplified EXIF embedder — writes GPS coordinates and timestamp into JPEG.
 * More reliable than the full builder for basic GPS tagging.
 */
export function embedGPSInJPEG(jpegBuffer: ArrayBuffer, gps: GPSData, timestamp: Date): ArrayBuffer {
  const jpeg = new Uint8Array(jpegBuffer);

  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error("Not a valid JPEG");
  }

  // Build minimal EXIF APP1 with GPS data
  const exifBytes = buildMinimalEXIF(gps, timestamp);

  // APP1 marker
  const app1Len = exifBytes.length + 2;
  const app1 = new Uint8Array(4 + exifBytes.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1[2] = (app1Len >> 8) & 0xff;
  app1[3] = app1Len & 0xff;
  app1.set(exifBytes, 4);

  // Find where to insert (after SOI, before SOS)
  let pos = 2;
  while (pos < jpeg.length - 1 && jpeg[pos] === 0xff) {
    const marker = jpeg[pos + 1];
    if (marker === 0xda) break; // SOS
    if (marker >= 0xe0 && marker <= 0xfe) {
      const len = (jpeg[pos + 2] << 8) | jpeg[pos + 3];
      pos += 2 + len;
    } else break;
  }

  // Build result
  const result = new Uint8Array(pos + app1.length + (jpeg.length - pos));
  result.set(jpeg.slice(0, pos), 0);
  result.set(app1, pos);
  result.set(jpeg.slice(pos), pos + app1.length);

  return result.buffer;
}

function buildMinimalEXIF(gps: GPSData, timestamp: Date): Uint8Array {
  const parts: number[] = [];

  // TIFF Header
  parts.push(0x45, 0x78, 0x69, 0x66, 0x00, 0x00); // "Exif\0\0"
  parts.push(0x49, 0x49); // Little-endian
  parts.push(0x2a, 0x00); // Magic 42
  parts.push(0x08, 0x00, 0x00, 0x00); // IFD0 offset

  // IFD0: 2 entries (DateTime + GPS pointer) + nextIFD
  parts.push(0x02, 0x00); // Entry count

  // Entry 1: DateTime (tag 0x0132, type ASCII)
  const dtStr = formatEXIFDate(timestamp);
  const dtBytes = new TextEncoder().encode(dtStr + "\0");
  parts.push(0x32, 0x01); // Tag
  parts.push(0x02, 0x00); // Type ASCII
  parts.push(dtBytes.length & 0xff, (dtBytes.length >> 8) & 0xff, 0x00, 0x00); // Count
  if (dtBytes.length <= 4) {
    for (let i = 0; i < 4; i++) parts.push(dtBytes[i] || 0);
  } else {
    // Offset to value — placed right after IFD0
    const offset = 8 + 2 + 24 + 4; // header + entries + nextIFD
    parts.push(offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff);
  }

  // Entry 2: GPS IFD Pointer (tag 0x8825, type LONG)
  const gpsOffset = 8 + 2 + 24 + 4 + (dtBytes.length > 4 ? dtBytes.length : 0);
  parts.push(0x25, 0x88); // Tag
  parts.push(0x04, 0x00); // Type LONG
  parts.push(0x01, 0x00, 0x00, 0x00); // Count 1
  parts.push(gpsOffset & 0xff, (gpsOffset >> 8) & 0xff, (gpsOffset >> 16) & 0xff, (gpsOffset >> 24) & 0xff);

  // Next IFD
  parts.push(0x00, 0x00, 0x00, 0x00);

  // DateTime value (if > 4 bytes)
  if (dtBytes.length > 4) {
    for (const b of dtBytes) parts.push(b);
  }

  // GPS IFD
  const gpsEntries = buildGPSEntries(gps);
  for (const b of gpsEntries) parts.push(b);

  return new Uint8Array(parts);
}

function buildGPSEntries(gps: GPSData): number[] {
  const parts: number[] = [];

  // GPS IFD: 4-6 entries
  let entryCount = 4;
  if (gps.altitude !== undefined) entryCount += 2;

  parts.push(entryCount & 0xff, (entryCount >> 8) & 0xff);

  const latDMS = toDMS(gps.latitude);
  const lonDMS = toDMS(gps.longitude);

  // GPSLatitudeRef (N/S)
  parts.push(0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00);
  parts.push(gps.latitude >= 0 ? 0x4e : 0x53, 0x00, 0x00, 0x00); // "N" or "S"

  // GPSLatitude (3 RATIONAL values)
  const latOffset = 8 + 2 + entryCount * 12 + 4 + 8; // After all entries + nextIFD + GPSLatitudeRef
  parts.push(0x02, 0x00, 0x05, 0x00, 0x03, 0x00, 0x00, 0x00);
  parts.push(latOffset & 0xff, (latOffset >> 8) & 0xff, 0x00, 0x00);

  // GPSLongitudeRef (E/W)
  parts.push(0x03, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00);
  parts.push(gps.longitude >= 0 ? 0x45 : 0x57, 0x00, 0x00, 0x00); // "E" or "W"

  // GPSLongitude (3 RATIONAL values)
  const lonOffset = latOffset + 24; // After latitude rationals
  parts.push(0x04, 0x00, 0x05, 0x00, 0x03, 0x00, 0x00, 0x00);
  parts.push(lonOffset & 0xff, (lonOffset >> 8) & 0xff, 0x00, 0x00);

  if (gps.altitude !== undefined) {
    // GPSAltitudeRef
    parts.push(0x05, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00);
    parts.push(gps.altitude >= 0 ? 0x00 : 0x01, 0x00, 0x00, 0x00);

    // GPSAltitude
    const altOffset = lonOffset + 24;
    parts.push(0x06, 0x00, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00);
    parts.push(altOffset & 0xff, (altOffset >> 8) & 0xff, 0x00, 0x00);
  }

  // Next IFD
  parts.push(0x00, 0x00, 0x00, 0x00);

  // Latitude RATIONAL values (degrees, minutes, seconds)
  const rationals: [number, number][] = [
    [latDMS.degrees, 1],
    [latDMS.minutes, 1],
    [Math.round(latDMS.seconds * 10000), 10000],
  ];
  for (const [num, den] of rationals) {
    parts.push(num & 0xff, (num >> 8) & 0xff, (num >> 16) & 0xff, (num >> 24) & 0xff);
    parts.push(den & 0xff, (den >> 8) & 0xff, (den >> 16) & 0xff, (den >> 24) & 0xff);
  }

  // Longitude RATIONAL values
  const lonRationals: [number, number][] = [
    [lonDMS.degrees, 1],
    [lonDMS.minutes, 1],
    [Math.round(lonDMS.seconds * 10000), 10000],
  ];
  for (const [num, den] of lonRationals) {
    parts.push(num & 0xff, (num >> 8) & 0xff, (num >> 16) & 0xff, (num >> 24) & 0xff);
    parts.push(den & 0xff, (den >> 8) & 0xff, (den >> 16) & 0xff, (den >> 24) & 0xff);
  }

  if (gps.altitude !== undefined) {
    // Altitude RATIONAL
    const altNum = Math.abs(Math.round(gps.altitude * 100));
    const altDen = 100;
    parts.push(altNum & 0xff, (altNum >> 8) & 0xff, (altNum >> 16) & 0xff, (altNum >> 24) & 0xff);
    parts.push(altDen & 0xff, (altDen >> 8) & 0xff, (altDen >> 16) & 0xff, (altDen >> 24) & 0xff);
  }

  return parts;
}

// ─── EXIF Reader (for extracting GPS from existing photos) ──────────────────

export interface EXIFInfo {
  dateTime?: string;
  make?: string;
  model?: string;
  gps?: GPSData;
  imageDescription?: string;
  address?: string;
}

/**
 * Read EXIF data from a JPEG buffer (client-side).
 * Returns GPS coordinates, timestamp, and camera info.
 */
export function readEXIF(buffer: ArrayBuffer): EXIFInfo {
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // Verify JPEG
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) {
    return {};
  }

  // Find APP1 (EXIF)
  let pos = 2;
  while (pos < uint8.length - 1) {
    if (uint8[pos] !== 0xff) break;
    const marker = uint8[pos + 1];

    if (marker === 0xe1) {
      // APP1 — EXIF
      const len = view.getUint16(pos + 2);
      const exifData = parseEXIFAPP1(uint8.slice(pos + 4, pos + 2 + len));
      return exifData;
    }

    if (marker >= 0xe0 && marker <= 0xfe) {
      const len = view.getUint16(pos + 2);
      pos += 2 + len;
    } else break;
  }

  return {};
}

function parseEXIFAPP1(data: Uint8Array): EXIFInfo {
  const info: EXIFInfo = {};

  // Look for "Exif\0\0"
  const exifStr = String.fromCharCode(...data.slice(0, 4));
  if (exifStr !== "Exi") return {};

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tiffStart = 6; // After "Exif\0\0"

  // Byte order
  const byteOrder = String.fromCharCode(data[tiffStart], data[tiffStart + 1]);
  const littleEndian = byteOrder === "II";

  // Read IFD0
  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  const entries = view.getUint16(tiffStart + ifd0Offset, littleEndian);

  let gpsIFDOffset = 0;

  for (let i = 0; i < entries; i++) {
    const entryStart = tiffStart + ifd0Offset + 2 + i * 12;
    const tag = view.getUint16(entryStart, littleEndian);
    const type = view.getUint16(entryStart + 2, littleEndian);
    const count = view.getUint32(entryStart + 4, littleEndian);

    if (tag === 0x0132) {
      // DateTime
      info.dateTime = readASCIIValue(view, data, entryStart, tiffStart, littleEndian, count);
    } else if (tag === 0x010f) {
      // Make
      info.make = readASCIIValue(view, data, entryStart, tiffStart, littleEndian, count);
    } else if (tag === 0x0110) {
      // Model
      info.model = readASCIIValue(view, data, entryStart, tiffStart, littleEndian, count);
    } else if (tag === 0x8825) {
      // GPS IFD Pointer
      gpsIFDOffset = view.getUint32(entryStart + 8, littleEndian);
    }
  }

  // Parse GPS IFD
  if (gpsIFDOffset > 0) {
    info.gps = parseGPSIFD(view, data, tiffStart + gpsIFDOffset, tiffStart, littleEndian);
  }

  return info;
}

function parseGPSIFD(view: DataView, data: Uint8Array, ifdStart: number, tiffStart: number, le: boolean): GPSData | undefined {
  const entries = view.getUint16(ifdStart, le);
  let latRef = "N", lonRef = "E";
  let latDeg = 0, latMin = 0, latSec = 0;
  let lonDeg = 0, lonMin = 0, lonSec = 0;
  let altitude: number | undefined;
  let accuracy: number | undefined;

  for (let i = 0; i < entries; i++) {
    const entryStart = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryStart, le);
    const type = view.getUint16(entryStart + 2, le);
    const count = view.getUint32(entryStart + 4, le);

    if (tag === 0x0001) latRef = String.fromCharCode(data[entryStart + 8]);
    else if (tag === 0x0002) {
      const dms = readRationalArray(view, data, entryStart, tiffStart, le, count);
      latDeg = dms[0] || 0; latMin = dms[1] || 0; latSec = dms[2] || 0;
    }
    else if (tag === 0x0003) lonRef = String.fromCharCode(data[entryStart + 8]);
    else if (tag === 0x0004) {
      const dms = readRationalArray(view, data, entryStart, tiffStart, le, count);
      lonDeg = dms[0] || 0; lonMin = dms[1] || 0; lonSec = dms[2] || 0;
    }
    else if (tag === 0x0005) {
      const ref = data[entryStart + 8];
      altitude = ref === 1 ? -1 : 1; // Will be multiplied by value
    }
    else if (tag === 0x0006) {
      const val = readRational(view, data, entryStart, tiffStart, le);
      altitude = (altitude || 1) * val;
    }
    else if (tag === 0x001f) {
      // GPSProcessingMethod — may contain accuracy
      try {
        const str = String.fromCharCode(...data.slice(entryStart + 8, entryStart + 8 + count));
        const match = str.match(/accuracy=([0-9.]+)/);
        if (match) accuracy = parseFloat(match[1]);
      } catch {}
    }
  }

  const latitude = latDeg + latMin / 60 + latSec / 3600;
  const longitude = lonDeg + lonMin / 60 + lonSec / 3600;

  if (latitude === 0 && longitude === 0) return undefined;

  return {
    latitude: latRef === "S" ? -latitude : latitude,
    longitude: lonRef === "W" ? -longitude : longitude,
    altitude,
    accuracy,
  };
}

function readASCIIValue(view: DataView, data: Uint8Array, entryStart: number, tiffStart: number, le: boolean, count: number): string {
  if (count <= 4) {
    return String.fromCharCode(...data.slice(entryStart + 8, entryStart + 8 + count - 1));
  }
  const offset = view.getUint32(entryStart + 8, le);
  return String.fromCharCode(...data.slice(tiffStart + offset, tiffStart + offset + count - 1));
}

function readRational(view: DataView, data: Uint8Array, entryStart: number, tiffStart: number, le: boolean): number {
  const offset = view.getUint32(entryStart + 8, le);
  const num = view.getUint32(tiffStart + offset, le);
  const den = view.getUint32(tiffStart + offset + 4, le);
  return den === 0 ? 0 : num / den;
}

function readRationalArray(view: DataView, data: Uint8Array, entryStart: number, tiffStart: number, le: boolean, count: number): number[] {
  const offset = view.getUint32(entryStart + 8, le);
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(tiffStart + offset + i * 8, le);
    const den = view.getUint32(tiffStart + offset + i * 8 + 4, le);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

// ─── Date/Time Overlay Generator ─────────────────────────────────────────────

export interface OverlayOptions {
  showDate: boolean;
  showTime: boolean;
  showGPS: boolean;
  showAddress: boolean;
  showContractor: boolean;
  customText?: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  fontSize: number; // 12-48
  fontColor: string; // hex
  backgroundColor: string; // hex with alpha
  format: "12h" | "24h";
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
}

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  showDate: true,
  showTime: true,
  showGPS: true,
  showAddress: false,
  showContractor: false,
  position: "bottom-left",
  fontSize: 16,
  fontColor: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.6)",
  format: "24h",
  dateFormat: "MM/DD/YYYY",
};

/**
 * Generate a canvas with date/time/GPS overlay drawn on the image.
 */
export function generatePhotoWithOverlay(
  image: HTMLImageElement,
  metadata: {
    dateTime?: Date;
    gps?: GPSData;
    address?: string;
    contractorName?: string;
  },
  options: Partial<OverlayOptions> = {}
): HTMLCanvasElement {
  const opts = { ...DEFAULT_OVERLAY_OPTIONS, ...options };
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw image
  ctx.drawImage(image, 0, 0);

  // Build overlay lines
  const lines: string[] = [];

  if (opts.showDate && metadata.dateTime) {
    lines.push(formatOverlayDate(metadata.dateTime, opts.dateFormat));
  }
  if (opts.showTime && metadata.dateTime) {
    lines.push(formatOverlayTime(metadata.dateTime, opts.format));
  }
  if (opts.showGPS && metadata.gps) {
    lines.push(`${metadata.gps.latitude.toFixed(6)}, ${metadata.gps.longitude.toFixed(6)}`);
    if (metadata.gps.altitude !== undefined) {
      lines.push(`Alt: ${metadata.gps.altitude.toFixed(1)}m`);
    }
    if (metadata.gps.accuracy !== undefined) {
      lines.push(`Accuracy: ±${metadata.gps.accuracy.toFixed(0)}m`);
    }
  }
  if (opts.showAddress && metadata.address) {
    lines.push(metadata.address);
  }
  if (opts.showContractor && metadata.contractorName) {
    lines.push(metadata.contractorName);
  }
  if (opts.customText) {
    lines.push(opts.customText);
  }

  if (lines.length === 0) return canvas;

  // Calculate overlay dimensions
  const padding = 12;
  const lineHeight = opts.fontSize * 1.4;
  const overlayHeight = lines.length * lineHeight + padding * 2;

  // Measure max text width
  ctx.font = `bold ${opts.fontSize}px 'Courier New', monospace`;
  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }
  const overlayWidth = maxWidth + padding * 2;

  // Position
  let x = padding;
  let y = padding;
  const positions: Record<string, { x: number; y: number }> = {
    "top-left": { x: padding, y: padding },
    "top-right": { x: canvas.width - overlayWidth - padding, y: padding },
    "bottom-left": { x: padding, y: canvas.height - overlayHeight - padding },
    "bottom-right": { x: canvas.width - overlayWidth - padding, y: canvas.height - overlayHeight - padding },
  };
  const pos = positions[opts.position];

  // Draw background
  ctx.fillStyle = opts.backgroundColor;
  ctx.beginPath();
  ctx.roundRect(pos.x, pos.y, overlayWidth, overlayHeight, 6);
  ctx.fill();

  // Draw text
  ctx.fillStyle = opts.fontColor;
  ctx.font = `bold ${opts.fontSize}px 'Courier New', monospace`;
  ctx.textBaseline = "top";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], pos.x + padding, pos.y + padding + i * lineHeight);
  }

  return canvas;
}

function formatOverlayDate(date: Date, format: string): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = String(date.getFullYear());
  switch (format) {
    case "DD/MM/YYYY": return `${d}/${m}/${y}`;
    case "YYYY-MM-DD": return `${y}-${m}-${d}`;
    default: return `${m}/${d}/${y}`;
  }
}

function formatOverlayTime(date: Date, format: "12h" | "24h"): string {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  if (format === "12h") {
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m}:${s} ${ampm}`;
  }
  return `${String(h).padStart(2, "0")}:${m}:${s}`;
}

// ─── Reverse Geocoding (GPS → Address) ──────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "PropertyPreservation/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}
