import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildInsightLiquidGlassDisplacementDataUrl,
  INSIGHT_LIQUID_GLASS_DISP_SCALE,
  INSIGHT_LIQUID_GLASS_FILTER_ID,
} from '@/insight/insightLiquidGlassMap';

const CHROME_LIQUID_GLASS_FLAG = 'insight-chrome-liquid-glass-backdrop';

/**
 * SVG filters as backdrop-filter are Chromium-only in practice (kube.io article).
 */
function insightSupportsSvgLiquidGlass(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return false;
  if (
    ua.includes('Safari/') &&
    !ua.includes('Chrome') &&
    !ua.includes('Chromium') &&
    !ua.includes('Edg')
  ) {
    return false;
  }
  return /Chrome|Chromium|Edg/i.test(ua);
}

export interface InsightLiquidGlassBackdropFilterProps {
  /** Typical bar width/height for pill aspect (e.g. 356/48) */
  aspectWidthOverHeight?: number;
}

/**
 * Injects SVG filter defs + displacement image for kube.io-style liquid glass.
 * Sets `html.insight-chrome-liquid-glass-backdrop` when `backdrop-filter: url()` works.
 */
export function InsightLiquidGlassBackdropFilter({
  aspectWidthOverHeight = 10.5,
}: InsightLiquidGlassBackdropFilterProps) {
  const [href, setHref] = useState<string | null>(null);

  const dataUrl = useMemo(() => {
    if (typeof document === 'undefined') return '';
    return buildInsightLiquidGlassDisplacementDataUrl(aspectWidthOverHeight);
  }, [aspectWidthOverHeight]);

  useEffect(() => {
    if (!dataUrl) return;
    setHref(dataUrl);
  }, [dataUrl]);

  useEffect(() => {
    if (!href || typeof document === 'undefined') return;
    if (!insightSupportsSvgLiquidGlass()) return;
    document.documentElement.classList.add(CHROME_LIQUID_GLASS_FLAG);
    return () => {
      document.documentElement.classList.remove(CHROME_LIQUID_GLASS_FLAG);
    };
  }, [href]);

  const svg =
    href && typeof document !== 'undefined' ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="0"
        height="0"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          visibility: 'hidden',
        }}
        aria-hidden
      >
        <defs>
          <filter
            id={INSIGHT_LIQUID_GLASS_FILTER_ID}
            colorInterpolationFilters="sRGB"
            x="-35%"
            y="-35%"
            width="170%"
            height="170%"
          >
            <feImage
              href={href}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="displacement_map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="displacement_map"
              scale={INSIGHT_LIQUID_GLASS_DISP_SCALE}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    ) : null;

  return svg && typeof document !== 'undefined'
    ? createPortal(svg, document.body)
    : null;
}
