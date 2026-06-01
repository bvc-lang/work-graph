import type { FlowCanvas } from 'lit-flow';

type FlowNodeState = {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
};

type FlowInstanceLike = {
  container: HTMLElement | null;
  getState: () => { nodes: FlowNodeState[]; viewport: { x: number; y: number; zoom: number } };
  getViewport: () => { x: number; y: number; zoom: number };
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  subscribe: (callback: () => void) => () => void;
};

type GraphBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type MinimapTransform = {
  bounds: GraphBounds;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type GraphCanvasMinimapOptions = {
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
};

const minimapCleanups = new WeakMap<HTMLElement, () => void>();

function nodeSize(node: FlowNodeState) {
  return {
    width: node.measured?.width ?? node.width ?? 240,
    height: node.measured?.height ?? node.height ?? 96,
  };
}

function computeGraphBounds(nodes: FlowNodeState[]): GraphBounds | null {
  if (nodes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { width, height } = nodeSize(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  const pad = 28;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: Math.max(1, maxX - minX + pad * 2),
    height: Math.max(1, maxY - minY + pad * 2),
  };
}

function buildMinimapTransform(bounds: GraphBounds, width: number, height: number): MinimapTransform {
  const scale = Math.min(width / bounds.width, height / bounds.height);
  const offsetX = (width - bounds.width * scale) / 2;
  const offsetY = (height - bounds.height * scale) / 2;
  return { bounds, scale, offsetX, offsetY };
}

function graphToMinimap(transform: MinimapTransform, x: number, y: number) {
  return {
    x: transform.offsetX + (x - transform.bounds.minX) * transform.scale,
    y: transform.offsetY + (y - transform.bounds.minY) * transform.scale,
  };
}

function minimapToGraph(transform: MinimapTransform, x: number, y: number) {
  return {
    x: transform.bounds.minX + (x - transform.offsetX) / transform.scale,
    y: transform.bounds.minY + (y - transform.offsetY) / transform.scale,
  };
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

export function mountGraphCanvasMinimap(
  host: HTMLElement,
  getCanvas: () => FlowCanvas | null,
  options: GraphCanvasMinimapOptions = {},
): () => void {
  minimapCleanups.get(host)?.();

  const width = options.width ?? 168;
  const height = options.height ?? 108;
  host.replaceChildren();
  host.classList.add('graph-canvas-minimap');
  host.dataset.theme = options.theme ?? 'light';
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', 'Graph overview');

  const svg = createSvgElement('svg', {
    width: String(width),
    height: String(height),
    viewBox: `0 0 ${width} ${height}`,
  });
  const nodesLayer = createSvgElement('g', { class: 'graph-canvas-minimap-nodes' });
  const viewportLayer = createSvgElement('rect', {
    class: 'graph-canvas-minimap-viewport',
    'pointer-events': 'none',
  });
  svg.appendChild(nodesLayer);
  svg.appendChild(viewportLayer);
  host.appendChild(svg);

  let unsubscribe: (() => void) | null = null;
  let rafId = 0;
  let latestTransform: MinimapTransform | null = null;

  const schedulePaint = () => {
    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(paint);
  };

  const paint = () => {
    const canvas = getCanvas();
    const instance = canvas?.instance as FlowInstanceLike | undefined;
    if (!instance) {
      nodesLayer.replaceChildren();
      viewportLayer.setAttribute('width', '0');
      viewportLayer.setAttribute('height', '0');
      return;
    }

    const { nodes } = instance.getState();
    const bounds = computeGraphBounds(nodes);
    if (!bounds) {
      nodesLayer.replaceChildren();
      viewportLayer.setAttribute('width', '0');
      viewportLayer.setAttribute('height', '0');
      return;
    }

    latestTransform = buildMinimapTransform(bounds, width, height);
    nodesLayer.replaceChildren();

    for (const node of nodes) {
      const size = nodeSize(node);
      const topLeft = graphToMinimap(latestTransform, node.position.x, node.position.y);
      const rect = createSvgElement('rect', {
        class: 'graph-canvas-minimap-node',
        x: String(topLeft.x),
        y: String(topLeft.y),
        width: String(Math.max(2, size.width * latestTransform.scale)),
        height: String(Math.max(2, size.height * latestTransform.scale)),
        rx: '2',
      });
      nodesLayer.appendChild(rect);
    }

    const container = instance.container ?? canvas;
    const viewport = instance.getViewport();
    const zoom = viewport.zoom || 1;
    const visibleX = -viewport.x / zoom;
    const visibleY = -viewport.y / zoom;
    const visibleWidth = container.clientWidth / zoom;
    const visibleHeight = container.clientHeight / zoom;
    const viewportTopLeft = graphToMinimap(latestTransform, visibleX, visibleY);
    const viewportBottomRight = graphToMinimap(
      latestTransform,
      visibleX + visibleWidth,
      visibleY + visibleHeight,
    );

    viewportLayer.setAttribute('x', String(viewportTopLeft.x));
    viewportLayer.setAttribute('y', String(viewportTopLeft.y));
    viewportLayer.setAttribute('width', String(Math.max(2, viewportBottomRight.x - viewportTopLeft.x)));
    viewportLayer.setAttribute('height', String(Math.max(2, viewportBottomRight.y - viewportTopLeft.y)));
  };

  const bindInstance = () => {
    unsubscribe?.();
    unsubscribe = null;

    const canvas = getCanvas();
    const instance = canvas?.instance as FlowInstanceLike | undefined;
    if (!instance?.subscribe) {
      window.requestAnimationFrame(bindInstance);
      return;
    }

    unsubscribe = instance.subscribe(schedulePaint);
    schedulePaint();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!latestTransform) {
      return;
    }
    const canvas = getCanvas();
    const instance = canvas?.instance as FlowInstanceLike | undefined;
    if (!instance) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const graphPoint = minimapToGraph(latestTransform, localX, localY);
    const container = instance.container ?? canvas;
    const viewport = instance.getViewport();
    const zoom = viewport.zoom || 1;

    instance.setViewport({
      x: container.clientWidth / 2 - graphPoint.x * zoom,
      y: container.clientHeight / 2 - graphPoint.y * zoom,
      zoom,
    });
    event.preventDefault();
  };

  svg.addEventListener('pointerdown', onPointerDown);

  const cleanup = () => {
    window.cancelAnimationFrame(rafId);
    unsubscribe?.();
    unsubscribe = null;
    svg.removeEventListener('pointerdown', onPointerDown);
    host.replaceChildren();
  };

  minimapCleanups.set(host, cleanup);
  bindInstance();

  return cleanup;
}

export function unmountGraphCanvasMinimap(host: HTMLElement) {
  minimapCleanups.get(host)?.();
  minimapCleanups.delete(host);
}
