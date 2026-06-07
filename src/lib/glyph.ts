/**
 * Tucan's brand glyph: a sharp 4-point diamond (the "sparkle" in the reference
 * accumulation grid). Returned as an SVG path inside a `size`×`size` box so it
 * can be drawn once per cell inside a single <Svg> for performance.
 */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function diamondPath(size: number): string {
  const c = size / 2;
  const outer = size / 2;
  const inner = outer * 0.42; // controls how concave (sharp) the points are
  const d = r2(inner * Math.SQRT1_2);
  const o = r2(outer);
  const cc = r2(c);

  return [
    `M ${cc},${r2(c - outer)}`, // top
    `L ${r2(c + d)},${r2(c - d)}`,
    `L ${r2(c + outer)},${cc}`, // right
    `L ${r2(c + d)},${r2(c + d)}`,
    `L ${cc},${r2(c + outer)}`, // bottom
    `L ${r2(c - d)},${r2(c + d)}`,
    `L ${r2(c - o)},${cc}`, // left
    `L ${r2(c - d)},${r2(c - d)}`,
    'Z',
  ].join(' ');
}
