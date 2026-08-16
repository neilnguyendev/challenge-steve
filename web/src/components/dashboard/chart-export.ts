/**
 * Exporting the chart as an image.
 *
 * Recharts draws real SVG, so the picture is already in the page — serialising
 * that and painting it onto a canvas needs no rendering library. Adding
 * html2canvas to re-rasterise something the browser can already hand us would
 * be a dependency earning nothing.
 */

export function exportFileName(weekStart: string, compareMode: boolean): string {
  return compareMode
    ? `revenue-trend-${weekStart}-vs-previous.png`
    : `revenue-trend-${weekStart}.png`;
}

/**
 * Inlines the SVG as a data URL an <img> can load.
 *
 * Width and height are written onto the clone: Recharts sizes its SVG through
 * CSS, and a data-URL image with no intrinsic size draws as nothing.
 */
export function buildSvgDataUrl(svg: SVGSVGElement, width: number, height: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const markup = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export interface ExportTarget {
  svg: SVGSVGElement;
  width: number;
  height: number;
}

/** Reads the chart out of its container, or null if there is nothing drawn. */
export function findChartSvg(container: HTMLElement | null): ExportTarget | null {
  const svg = container?.querySelector("svg");
  if (!svg) return null;

  const box = svg.getBoundingClientRect();
  return {
    svg: svg as SVGSVGElement,
    width: Math.round(box.width) || 960,
    height: Math.round(box.height) || 360,
  };
}

/**
 * Paints the chart onto a canvas and hands the browser a PNG to save.
 *
 * The canvas is filled white first: SVG has no background, and a transparent
 * PNG pasted into a document turns the axis labels invisible.
 */
export async function downloadChartPng(
  target: ExportTarget,
  fileName: string,
): Promise<void> {
  const { svg, width, height } = target;
  const scale = window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot render the image");

  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const image = new Image();
  image.src = buildSvgDataUrl(svg, width, height);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The chart could not be converted"));
  });

  context.drawImage(image, 0, 0, width, height);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}
