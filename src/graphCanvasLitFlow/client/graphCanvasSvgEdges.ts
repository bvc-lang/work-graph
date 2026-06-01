import {
  buildGraphCanvasEdgeLabelHtml,
  buildGraphCanvasEdgeStrokeStyle,
} from '../graphCanvasEdgeLabels.mjs';
import { buildGraphCanvasEdgeRoutes } from '../graphCanvasEdgeRouter.mjs';
import type { FlowCanvas } from 'lit-flow';

type GraphCanvasProjection = {
  layoutDirection?: string;
  nodes: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>;
  edges: Array<{ id?: string; from: string; to: string; label?: string; rejected?: boolean; upstream?: boolean }>;
};

type SvgEdgeLayer = {
  host: HTMLElement;
  svg: SVGSVGElement;
  labelsLayer: HTMLElement;
  observer: MutationObserver | null;
  paintKey: string;
};

const svgEdgeLayers = new WeakMap<FlowCanvas, SvgEdgeLayer>();

function resolveGraphCanvasTheme(): 'dark' | 'light' {
  return document.body?.dataset?.theme === 'dark' ? 'dark' : 'light';
}

function buildPaintKey(projection: GraphCanvasProjection, theme: 'dark' | 'light') {
  return `${theme}:${projection.layoutDirection ?? 'LR'}:${projection.edges.length}:${projection.nodes.length}`;
}

function buildMarkerDefs(theme: 'dark' | 'light') {
  const color = theme === 'dark' ? '#858585' : '#8b8b95';
  return `
    <defs>
      <marker id="wg-edge-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,6 L0,12 Z" fill="${color}" />
      </marker>
      <marker id="wg-edge-arrow-upstream" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,6 L0,12 Z" fill="${color}" opacity="0.72" />
      </marker>
      <marker id="wg-edge-arrow-rejected" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0 L12,6 L0,12 Z" fill="${color}" opacity="0.42" />
      </marker>
    </defs>
  `;
}

function paintSvgEdges(
  layer: SvgEdgeLayer,
  projection: GraphCanvasProjection,
  theme: 'dark' | 'light',
  force = false,
) {
  const paintKey = buildPaintKey(projection, theme);
  if (!force && layer.paintKey === paintKey) {
    return;
  }

  const routes = buildGraphCanvasEdgeRoutes(projection);
  const paths = routes.map((route) => {
    const stroke = buildGraphCanvasEdgeStrokeStyle(
      { rejected: route.rejected, upstream: route.upstream },
      theme,
    );
    const marker = route.rejected
      ? 'url(#wg-edge-arrow-rejected)'
      : route.upstream
        ? 'url(#wg-edge-arrow-upstream)'
        : 'url(#wg-edge-arrow)';
    const dash = route.rejected
      ? 'stroke-dasharray="6 4" opacity="0.42"'
      : route.upstream
        ? 'stroke-dasharray="5 4" opacity="0.72"'
        : '';
    return `<path class="graph-canvas-edge-path" data-edge-id="${route.id}" d="${route.d}" fill="none" stroke="${stroke.stroke}" stroke-width="${route.rejected ? 1.75 : 2.25}" marker-end="${marker}" ${dash} />`;
  }).join('');

  layer.svg.innerHTML = `${buildMarkerDefs(theme)}<g class="graph-canvas-edge-paths">${paths}</g>`;

  layer.labelsLayer.replaceChildren();
  for (const route of routes) {
    if (!route.label) {
      continue;
    }
    const labelHtml = buildGraphCanvasEdgeLabelHtml(route.label, theme, { rejected: route.rejected });
    if (!labelHtml) {
      continue;
    }
    const label = document.createElement('div');
    label.className = 'graph-canvas-edge-label';
    label.style.left = `${route.labelX}px`;
    label.style.top = `${route.labelY}px`;
    if (route.labelPlacement === 'start') {
      label.style.transform = 'translate(8px, -50%)';
    } else {
      label.style.transform = 'translate(-50%, -50%)';
    }
    label.innerHTML = labelHtml;
    layer.labelsLayer.appendChild(label);
  }

  layer.paintKey = paintKey;
}

function createSvgEdgeHost(): HTMLElement {
  const host = document.createElement('div');
  host.className = 'graph-canvas-wg-edges-layer';
  host.dataset.testid = 'graph-canvas-svg-edges';
  host.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;overflow:visible;';
  return host;
}

function createSvgEdgeLayer(host: HTMLElement): SvgEdgeLayer {
  host.replaceChildren();

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'graph-canvas-svg-edges-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;inset:0;overflow:visible;display:block;';

  const labelsLayer = document.createElement('div');
  labelsLayer.className = 'graph-canvas-svg-edge-labels';
  labelsLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';

  host.appendChild(svg);
  host.appendChild(labelsLayer);

  return {
    host,
    svg,
    labelsLayer,
    observer: null,
    paintKey: '',
  };
}

function getFlowViewport(canvas: FlowCanvas) {
  return canvas.shadowRoot?.querySelector('.flow-viewport') ?? null;
}

function restoreSvgEdgeLayerIfMissing(canvas: FlowCanvas, projection: GraphCanvasProjection) {
  const viewport = getFlowViewport(canvas);
  const nodesLayer = viewport?.querySelector('.flow-nodes-layer');
  if (!viewport || !nodesLayer) {
    return null;
  }

  let layer = svgEdgeLayers.get(canvas);
  if (layer?.host.isConnected && viewport.contains(layer.host)) {
    return layer;
  }

  const host = createSvgEdgeHost();
  viewport.insertBefore(host, nodesLayer);
  layer = createSvgEdgeLayer(host);
  svgEdgeLayers.set(canvas, layer);
  paintSvgEdges(layer, projection, resolveGraphCanvasTheme(), true);
  return layer;
}

function watchForSvgEdgeHostRemoval(canvas: FlowCanvas, projection: GraphCanvasProjection) {
  const root = canvas.shadowRoot;
  if (!root) {
    return;
  }

  const existing = svgEdgeLayers.get(canvas);
  existing?.observer?.disconnect();

  let restoring = false;
  const observer = new MutationObserver(() => {
    if (restoring) {
      return;
    }
    const viewport = getFlowViewport(canvas);
    if (!viewport?.querySelector('.flow-nodes-layer')) {
      return;
    }
    if (viewport.querySelector('.graph-canvas-wg-edges-layer')) {
      return;
    }

    restoring = true;
    try {
      restoreSvgEdgeLayerIfMissing(canvas, projection);
    } finally {
      restoring = false;
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  const layer = svgEdgeLayers.get(canvas);
  if (layer) {
    layer.observer = observer;
  }
}

export function injectFlowCanvasNativeEdgeHide(canvas: FlowCanvas) {
  const root = canvas.shadowRoot;
  if (!root || root.querySelector('[data-wg-hide-native-edges]')) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute('data-wg-hide-native-edges', 'true');
  style.textContent = `
    .flow-edges-layer,
    .flow-labels-overlay {
      display: none !important;
    }
  `;
  root.appendChild(style);
}

export function mountGraphCanvasSvgEdges(
  canvas: FlowCanvas,
  projection: GraphCanvasProjection,
): () => void {
  unmountGraphCanvasSvgEdges(canvas);

  let attempts = 0;
  const tryMount = () => {
    const layer = restoreSvgEdgeLayerIfMissing(canvas, projection);
    if (!layer) {
      attempts += 1;
      if (attempts < 120) {
        window.requestAnimationFrame(tryMount);
      }
      return;
    }
    watchForSvgEdgeHostRemoval(canvas, projection);
  };

  tryMount();

  return () => unmountGraphCanvasSvgEdges(canvas);
}

export function unmountGraphCanvasSvgEdges(canvas: FlowCanvas) {
  const layer = svgEdgeLayers.get(canvas);
  if (!layer) {
    return;
  }
  layer.observer?.disconnect();
  layer.host.remove();
  svgEdgeLayers.delete(canvas);
}

export function repaintGraphCanvasSvgEdges(
  canvas: FlowCanvas,
  projection: GraphCanvasProjection,
) {
  const layer = restoreSvgEdgeLayerIfMissing(canvas, projection);
  if (!layer) {
    return;
  }
  paintSvgEdges(layer, projection, resolveGraphCanvasTheme(), true);
}
