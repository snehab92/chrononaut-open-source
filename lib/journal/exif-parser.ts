// EXIF parser for extracting geolocation from photos
// Uses browser-native approach without external dependencies

export interface ExifData {
  latitude: number | null;
  longitude: number | null;
  dateTaken: Date | null;
  locationName?: string;
}

// Convert EXIF GPS coordinates to decimal degrees
function convertDMSToDD(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string
): number {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === "S" || direction === "W") {
    dd = dd * -1;
  }
  return dd;
}

// Parse EXIF data from image file
export async function parseExifFromFile(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as ArrayBuffer;
      if (!result) {
        resolve({ latitude: null, longitude: null, dateTaken: null });
        return;
      }

      try {
        const exif = parseExifFromBuffer(result);
        resolve(exif);
      } catch {
        resolve({ latitude: null, longitude: null, dateTaken: null });
      }
    };

    reader.onerror = () => {
      resolve({ latitude: null, longitude: null, dateTaken: null });
    };

    reader.readAsArrayBuffer(file);
  });
}

// Parse EXIF from ArrayBuffer (simplified parser for GPS data)
function parseExifFromBuffer(buffer: ArrayBuffer): ExifData {
  const view = new DataView(buffer);
  let latitude: number | null = null;
  let longitude: number | null = null;
  let dateTaken: Date | null = null;

  // Check for JPEG
  if (view.getUint16(0) !== 0xffd8) {
    return { latitude, longitude, dateTaken };
  }

  let offset = 2;
  const length = view.byteLength;

  while (offset < length) {
    if (view.getUint8(offset) !== 0xff) break;

    const marker = view.getUint8(offset + 1);

    // APP1 marker (EXIF)
    if (marker === 0xe1) {
      const exifLength = view.getUint16(offset + 2);
      const exifData = parseApp1(view, offset + 4, exifLength - 2);
      if (exifData.latitude !== null) latitude = exifData.latitude;
      if (exifData.longitude !== null) longitude = exifData.longitude;
      if (exifData.dateTaken !== null) dateTaken = exifData.dateTaken;
      break;
    }

    // Skip to next marker
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
    } else {
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }
  }

  return { latitude, longitude, dateTaken };
}

// Parse APP1 segment for EXIF data
function parseApp1(
  view: DataView,
  start: number,
  length: number
): ExifData {
  let latitude: number | null = null;
  let longitude: number | null = null;
  let dateTaken: Date | null = null;

  // Check for "Exif\0\0"
  const exifHeader =
    String.fromCharCode(view.getUint8(start)) +
    String.fromCharCode(view.getUint8(start + 1)) +
    String.fromCharCode(view.getUint8(start + 2)) +
    String.fromCharCode(view.getUint8(start + 3));

  if (exifHeader !== "Exif") {
    return { latitude, longitude, dateTaken };
  }

  const tiffStart = start + 6;

  // Check byte order (II = little endian, MM = big endian)
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949;

  // Find IFD0
  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
  const ifd0Start = tiffStart + ifd0Offset;

  // Parse IFD0 for date and GPS IFD pointer
  const ifd0Entries = view.getUint16(ifd0Start, littleEndian);
  let gpsIfdOffset: number | null = null;

  for (let i = 0; i < ifd0Entries; i++) {
    const entryOffset = ifd0Start + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);

    // DateTimeOriginal (0x9003) or DateTime (0x0132)
    if (tag === 0x0132 || tag === 0x9003) {
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
      const dateStr = readString(view, tiffStart + valueOffset, 19);
      const parsed = parseDateString(dateStr);
      if (parsed) dateTaken = parsed;
    }

    // GPS IFD Pointer (0x8825)
    if (tag === 0x8825) {
      gpsIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
    }
  }

  // Parse GPS IFD if found
  if (gpsIfdOffset !== null) {
    const gpsData = parseGpsIfd(view, tiffStart + gpsIfdOffset, tiffStart, littleEndian);
    latitude = gpsData.latitude;
    longitude = gpsData.longitude;
  }

  return { latitude, longitude, dateTaken };
}

// Parse GPS IFD
function parseGpsIfd(
  view: DataView,
  ifdStart: number,
  tiffStart: number,
  littleEndian: boolean
): { latitude: number | null; longitude: number | null } {
  let latitude: number | null = null;
  let longitude: number | null = null;
  let latRef = "N";
  let lonRef = "E";

  const entries = view.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < entries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

    switch (tag) {
      case 0x0001: // GPSLatitudeRef
        latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        break;
      case 0x0002: // GPSLatitude
        latitude = readGpsCoordinate(view, tiffStart + valueOffset, littleEndian);
        break;
      case 0x0003: // GPSLongitudeRef
        lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        break;
      case 0x0004: // GPSLongitude
        longitude = readGpsCoordinate(view, tiffStart + valueOffset, littleEndian);
        break;
    }
  }

  if (latitude !== null) {
    latitude = latRef === "S" ? -latitude : latitude;
  }
  if (longitude !== null) {
    longitude = lonRef === "W" ? -longitude : longitude;
  }

  return { latitude, longitude };
}

// Read GPS coordinate (3 rationals: degrees, minutes, seconds)
function readGpsCoordinate(
  view: DataView,
  offset: number,
  littleEndian: boolean
): number | null {
  try {
    const degNum = view.getUint32(offset, littleEndian);
    const degDen = view.getUint32(offset + 4, littleEndian);
    const minNum = view.getUint32(offset + 8, littleEndian);
    const minDen = view.getUint32(offset + 12, littleEndian);
    const secNum = view.getUint32(offset + 16, littleEndian);
    const secDen = view.getUint32(offset + 20, littleEndian);

    const degrees = degNum / degDen;
    const minutes = minNum / minDen;
    const seconds = secNum / secDen;

    return degrees + minutes / 60 + seconds / 3600;
  } catch {
    return null;
  }
}

// Read string from DataView
function readString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    const char = view.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str;
}

// Parse EXIF date string (YYYY:MM:DD HH:MM:SS)
function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

// Reverse geocode coordinates to location name
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    // Using OpenStreetMap Nominatim (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      {
        headers: {
          "User-Agent": "Chrononaut/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Build a friendly location name
    const address = data.address || {};
    const parts: string[] = [];

    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood);
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) {
      parts.push(address.state);
    }

    return parts.length > 0 ? parts.join(", ") : data.display_name?.split(",")[0] || null;
  } catch {
    return null;
  }
}
