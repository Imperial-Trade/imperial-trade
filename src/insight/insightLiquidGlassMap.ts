/**
 * Builds an RGBA displacement map for SVG feDisplacementMap (kube.io-style).
 * R,G encode normalized displacement; 128 = neutral. Convex elliptical bezel
 * approximates a stretched pill; subtle outward push near the rim.
 *
 * @see https://kube.io/blog/liquid-glass-css-svg/
 */

const MAP_SIZE = 128;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Convex squircle profile (article): y = (1 - (1-x)^4)^(1/4), x in [0,1]
 * x=0 at outer edge, x=1 at inner flat — we use distance field so x = 1 - edgeProximity
 */
function convexSquircleHeight(t: number): number {
  const x = Math.max(0, Math.min(1, 1 - t));
  return Math.pow(1 - Math.pow(1 - x, 4), 0.25);
}

/** Approximate derivative for displacement strength near bezel */
function profileStrength(distInside: number, bezel: number): number {
  if (distInside <= 0) return 0;
  const t = Math.min(1, distInside / bezel);
  const h = convexSquircleHeight(1 - t);
  return h;
}

export function buildInsightLiquidGlassDisplacementDataUrl(
  /** Width / height of the real UI bar — drives ellipse aspect in the map */
  aspectWidthOverHeight: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const img = ctx.createImageData(MAP_SIZE, MAP_SIZE);
  const data = img.data;

  const a = Math.max(1.2, aspectWidthOverHeight * 0.5);
  const b = 1;
  const bezel = 0.44;

  let maxMag = 1e-6;

  const vx: number[] = [];
  const vy: number[] = [];
  vx.length = MAP_SIZE * MAP_SIZE;
  vy.length = MAP_SIZE * MAP_SIZE;

  for (let j = 0; j < MAP_SIZE; j++) {
    for (let i = 0; i < MAP_SIZE; i++) {
      const u = i / (MAP_SIZE - 1);
      const v = j / (MAP_SIZE - 1);
      const px = (u - 0.5) * 2 * a;
      const py = (v - 0.5) * 2 * b;
      const idx = j * MAP_SIZE + i;

      const ell = Math.hypot(px / a, py / b) - 1;
      if (ell > 0.02) {
        vx[idx] = 0;
        vy[idx] = 0;
        continue;
      }

      const distInside = -ell;
      const str = profileStrength(distInside, bezel);
      const len = Math.hypot(px / (a * a), py / (b * b)) || 1e-6;
      const nx = (px / (a * a)) / len;
      const ny = (py / (b * b)) / len;
      const ox = nx * str;
      const oy = ny * str;
      vx[idx] = ox;
      vy[idx] = oy;
      maxMag = Math.max(maxMag, Math.hypot(ox, oy));
    }
  }

  for (let j = 0; j < MAP_SIZE; j++) {
    for (let i = 0; i < MAP_SIZE; i++) {
      const idx = j * MAP_SIZE + i;
      const ox = vx[idx] / maxMag;
      const oy = vy[idx] / maxMag;
      const p = idx * 4;
      data[p] = clampByte(128 + ox * 127);
      data[p + 1] = clampByte(128 + oy * 127);
      data[p + 2] = 128;
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export const INSIGHT_LIQUID_GLASS_FILTER_ID =
  'insight-liquid-glass-backdrop-filter';

/** feDisplacementMap scale — tune with map normalization */
export const INSIGHT_LIQUID_GLASS_DISP_SCALE = 11;
