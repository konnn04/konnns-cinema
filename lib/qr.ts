/**
 * Standalone, zero-dependency QR Code Generator in pure TypeScript.
 * Generates an SVG string or data URL for rendering in the browser or mobile.
 */

// Simple byte-mode QR Code Generator (Versions 1-6)
// Supports alphanumeric & byte URLs with Error Correction Level M/L

interface QRMatrix {
  size: number;
  data: boolean[][];
}

class QRCodeModel {
  typeNumber: number;
  modules: boolean[][] = [];
  moduleCount = 0;

  constructor(typeNumber: number = 4) {
    this.typeNumber = typeNumber;
    this.moduleCount = this.typeNumber * 4 + 17;
    for (let r = 0; r < this.moduleCount; r++) {
      this.modules[r] = new Array(this.moduleCount).fill(false);
    }
  }

  isDark(row: number, col: number): boolean {
    return this.modules[row]?.[col] ?? false;
  }
}

// GF(256) Math for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0, x = 1; i < 256; i++) {
  EXP_TABLE[i] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function glog(n: number) {
  if (n < 1) throw new Error('glog(' + n + ')');
  return LOG_TABLE[n];
}

function gexp(n: number) {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}

function rsMultiply(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]));
    }
  }
  return result;
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = rsMultiply(poly, [1, gexp(i)]);
  }
  return poly;
}

function rsCalculateEC(data: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const msg = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      const factor = glog(lead);
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gexp(glog(gen[j]) + factor);
      }
    }
  }
  return msg.slice(data.length);
}

export function createQRCodeMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  let version = 3;
  if (bytes.length > 80) version = 7;
  else if (bytes.length > 55) version = 5;
  else if (bytes.length > 35) version = 4;

  const size = version * 4 + 17;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isReserved[r][c] = true;
    }
  };

  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(nr, nc, isBlack);
        } else {
          setModule(nr, nc, false); // Separator
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (!isReserved[6][i]) setModule(6, i, val);
    if (!isReserved[i][6]) setModule(i, 6, val);
  }

  setModule(4 * version + 9, 8, true);

  for (let i = 0; i < 9; i++) {
    isReserved[8][i] = true;
    isReserved[i][8] = true;
    if (size - 1 - i >= 0) {
      isReserved[8][size - 1 - i] = true;
      isReserved[size - 1 - i][8] = true;
    }
  }

  // 3. Alignment patterns for Version >= 2
  if (version >= 2) {
    const pos = version === 3 ? [6, 22] : version === 4 ? [6, 26] : version === 5 ? [6, 30] : [6, 34];
    for (const r of pos) {
      for (const c of pos) {
        if (isReserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isDark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setModule(r + dr, c + dc, isDark);
          }
        }
      }
    }
  }

  // 4. Data bitstream encoding: Byte mode (0100) + length + bytes + terminator + padding
  const bitstream: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, 8); // Character count indicator
  for (const b of bytes) {
    pushBits(b, 8);
  }
  pushBits(0, 4); // Terminator

  // Pad to byte boundary
  while (bitstream.length % 8 !== 0) bitstream.push(0);

  // Total capacity in bytes for this version at Level L
  const totalDataBytes = version === 3 ? 44 : version === 4 ? 64 : version === 5 ? 86 : 108;
  const ecBytesCount = version === 3 ? 15 : version === 4 ? 20 : version === 5 ? 26 : 30;

  const dataBytes: number[] = [];
  for (let i = 0; i < bitstream.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bitstream[i + j];
    dataBytes.push(b);
  }

  // Pad bytes alternating 0xEC and 0x11
  let padByte = 0xec;
  while (dataBytes.length < totalDataBytes) {
    dataBytes.push(padByte);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // Calculate Reed-Solomon EC
  const ecBytes = rsCalculateEC(dataBytes, ecBytesCount);
  const finalBytes = [...dataBytes, ...ecBytes];

  // Convert to bits
  const finalBits: number[] = [];
  for (const b of finalBytes) {
    for (let i = 7; i >= 0; i--) finalBits.push((b >> i) & 1);
  }

  // 5. Fill modules in zigzag order with Mask 0 ((r+c)%2===0)
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const cols = [right, right - 1];
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of cols) {
        if (!isReserved[r][c]) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply mask 0: invert if (r + c) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // 6. Format info bits (Level L, Mask 0: 0b111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i] === 1;
    // Top-left
    if (i <= 5) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Right & Bottom
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

export function generateQRCodeSVG(text: string, size: number = 200): string {
  try {
    const matrix = createQRCodeMatrix(text);
    const count = matrix.length;
    const margin = 2;
    const totalSize = count + margin * 2;
    const cellSize = size / totalSize;

    let paths = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c]) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;
          paths += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="#ffffff" rx="8"/>
      <path d="${paths}" fill="#000000"/>
    </svg>`;
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50%" y="50%" fill="#333" font-size="12" text-anchor="middle" dominant-baseline="middle">QR Error</text>
    </svg>`;
  }
}
