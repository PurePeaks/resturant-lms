// Standalone vector QR code component for dynamic certificate verification.
// Encodes verification URL according to ISO/IEC 18004 specification.

interface CertificateQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// Galois Field Tables
const EXP_TABLE = new Array(256);
const LOG_TABLE = new Array(256);
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;

function glog(n: number) {
  if (n < 1) throw new Error("glog(" + n + ")");
  return LOG_TABLE[n];
}
function gexp(n: number) {
  let v = n;
  while (v < 0) v += 255;
  while (v >= 256) v -= 255;
  return EXP_TABLE[v];
}

function polyMultiply(p1: number[], p2: number[]) {
  const res = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      if (p1[i] !== 0 && p2[j] !== 0) {
        res[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]));
      }
    }
  }
  return res;
}

function polyMod(p: number[], gen: number[]) {
  const res = p.slice();
  while (res.length >= gen.length) {
    const lead = res[0];
    if (lead !== 0) {
      const factor = glog(lead);
      for (let i = 0; i < gen.length; i++) {
        if (gen[i] !== 0) {
          res[i] ^= gexp(glog(gen[i]) + factor);
        }
      }
    }
    res.shift();
  }
  return res;
}

function getErrorCorrectionPolynomial(errorCorrectionLength: number) {
  let poly = [1];
  for (let i = 0; i < errorCorrectionLength; i++) {
    poly = polyMultiply(poly, [1, gexp(i)]);
  }
  return poly;
}

const VERSION_SPECS = [
  null,
  { total: 26, ec: 10, blocks: 1, ver: 1 },
  { total: 44, ec: 16, blocks: 1, ver: 2 },
  { total: 70, ec: 26, blocks: 1, ver: 3 },
  { total: 100, ec: 18, blocks: 2, ver: 4 },
  { total: 134, ec: 24, blocks: 2, ver: 5 },
  { total: 172, ec: 16, blocks: 4, ver: 6 },
];

function generateQrMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);
  const dataLen = textBytes.length;

  let spec = null;
  for (let v = 1; v < VERSION_SPECS.length; v++) {
    const s = VERSION_SPECS[v];
    if (!s) continue;
    const dataCapacity = s.total - s.ec * s.blocks;
    if (dataLen + 2 <= dataCapacity) {
      spec = s;
      break;
    }
  }

  if (!spec) {
    // Fallback to highest supported
    spec = VERSION_SPECS[6]!;
  }

  const version = spec.ver;
  const size = version * 4 + 17;
  const totalDataBytes = spec.total - spec.ec * spec.blocks;

  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(dataLen, 8); // Char count
  for (const b of textBytes) {
    pushBits(b, 8);
  }

  // Terminator
  for (let i = 0; i < 4 && bits.length < totalDataBytes * 8; i++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i + b];
    }
    dataCodewords.push(byteVal);
  }

  const numBlocks = spec.blocks;
  const ecPerBlock = spec.ec;
  const dataPerBlock = Math.floor(dataCodewords.length / numBlocks);
  const genPoly = getErrorCorrectionPolynomial(ecPerBlock);

  const blockData: number[][] = [];
  const blockEC: number[][] = [];

  for (let b = 0; b < numBlocks; b++) {
    const d = dataCodewords.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
    blockData.push(d);
    const poly = d.concat(new Array(ecPerBlock).fill(0));
    const ec = polyMod(poly, genPoly);
    while (ec.length < ecPerBlock) ec.unshift(0);
    blockEC.push(ec);
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < dataPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(blockData[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(blockEC[b][i]);
    }
  }

  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunctionModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            setFunctionModule(mr, mc, true);
          } else {
            setFunctionModule(mr, mc, false);
          }
        } else {
          setFunctionModule(mr, mc, false);
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  const ALIGNMENT_LOCATIONS = [
    [],
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
  ];

  const alignPos = ALIGNMENT_LOCATIONS[version] || [];
  if (alignPos.length > 0) {
    for (const r of alignPos) {
      for (const c of alignPos) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setFunctionModule(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunctionModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunctionModule(i, 6, i % 2 === 0);
  }

  setFunctionModule(4 * version + 9, 8, true);

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  let bitIdx = 0;
  const allBits: number[] = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >> i) & 1);
    }
  }

  let right = size - 1;
  let upward = true;
  while (right > 0) {
    if (right === 6) right--;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    right -= 2;
    upward = !upward;
  }

  const FORMAT_POLY = 0x537;
  const FORMAT_MASK = 0x5412;
  const formatData = 0; // Level M, mask 0
  let formatRem = formatData << 10;
  for (let i = 14; i >= 10; i--) {
    if ((formatRem >> i) & 1) {
      formatRem ^= FORMAT_POLY << (i - 10);
    }
  }
  const formatCode = ((formatData << 10) | formatRem) ^ FORMAT_MASK;

  const formatBits: number[] = [];
  for (let i = 0; i < 15; i++) {
    formatBits.push((formatCode >> i) & 1);
  }

  const coordsTopLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = coordsTopLeft[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  const coordsBottomLeft = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8]
  ];
  const coordsTopRight = [
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
    [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 7; i++) {
    const [r, c] = coordsBottomLeft[i];
    matrix[r][c] = formatBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    const [r, c] = coordsTopRight[i];
    matrix[r][c] = formatBits[7 + i] === 1;
  }

  return matrix.map((row) => row.map((cell) => cell === true));
}

export default function CertificateQrCode({ value, size = 110, className = "" }: CertificateQrCodeProps) {
  let matrix: boolean[][] = [];
  try {
    matrix = generateQrMatrix(value);
  } catch {
    // If text fails, fallback to simple placeholder
    matrix = Array.from({ length: 21 }, () => Array(21).fill(false));
  }

  const matrixSize = matrix.length;
  const padding = 2; // Quiet zone
  const totalDim = matrixSize + padding * 2;

  let pathData = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + padding},${r + padding}h1v1h-1z `;
      }
    }
  }

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-neutral-900/90 p-2 shadow-lg print:border-neutral-800 print:bg-white print:p-1.5 ${className}`}
      style={{ width: size, height: size }}
      title={`Scan to verify: ${value}`}
    >
      <svg
        viewBox={`0 0 ${totalDim} ${totalDim}`}
        className="w-full h-full text-amber-400 print:text-black"
        shapeRendering="crispEdges"
      >
        <rect width={totalDim} height={totalDim} fill="transparent" />
        <path d={pathData} fill="currentColor" />
      </svg>
    </div>
  );
}
