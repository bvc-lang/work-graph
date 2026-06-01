import 'lit-flow/dist/style.css';
import './graphCanvasTheme.css';
import {
  FlowBackground,
  FlowCanvas,
  FlowControls,
} from 'lit-flow';
import { mountGraphCanvasMinimap, unmountGraphCanvasMinimap } from './graphCanvasMinimap.js';
import {
  injectFlowCanvasNativeEdgeHide,
  mountGraphCanvasSvgEdges,
  repaintGraphCanvasSvgEdges,
  unmountGraphCanvasSvgEdges,
} from './graphCanvasSvgEdges.js';
import { graphCanvasProjectionToFlow } from '../graphCanvasProjectionToFlow.mjs';
import {
  getDownstreamNodeIds,
  getIncomingNodeIds,
  getOutgoingNodeIds,
  getSiblingNodeIds,
  getUpstreamNodeIds,
  sortNodeIdsByVerticalPosition,
} from '../graphCanvasTraversal.mjs';
import './graphCardNode.js';

type GraphCanvasProjection = {
  schema: string;
  layoutDirection?: string;
  viewId?: string;
  nodes: Array<{ id: string; y?: number }>;
  edges: Array<{ id: string; from: string; to: string }>;
};

type MountOptions = {
  height?: number;
  fill?: boolean;
};

const mountedHosts = new WeakMap<HTMLElement, FlowCanvas>();
const themeObservers = new WeakMap<HTMLElement, MutationObserver>();
const resizeObservers = new WeakMap<HTMLElement, ResizeObserver>();
const minimapHosts = new WeakMap<HTMLElement, HTMLElement>();

function resolveGraphCanvasTheme(): 'dark' | 'light' {
  return document.body?.dataset?.theme === 'dark' ? 'dark' : 'light';
}

function applyGraphCanvasHostTheme(host: HTMLElement, theme: 'dark' | 'light') {
  host.dataset.graphTheme = theme;
}

function applyFlowCanvasTheme(
  canvas: FlowCanvas,
  background: FlowBackground,
  theme: 'dark' | 'light',
) {
  canvas.setAttribute('theme', theme);
  background.setAttribute('variant', 'dots');
  background.setAttribute('gap', theme === 'dark' ? '20' : '18');
  background.setAttribute('color', theme === 'dark' ? '#3c3c3c' : '#dfe1e6');
}

function watchGraphCanvasTheme(
  host: HTMLElement,
  canvas: FlowCanvas,
  background: FlowBackground,
  projection: GraphCanvasProjection,
  getSelectedNodeId: () => string,
) {
  themeObservers.get(host)?.disconnect();

  const observer = new MutationObserver(() => {
    const theme = resolveGraphCanvasTheme();
    applyGraphCanvasHostTheme(host, theme);
    applyFlowCanvasTheme(canvas, background, theme);
    minimapHosts.get(host)?.setAttribute('data-theme', theme);
    const { nodes } = graphCanvasProjectionToFlow(projection, { theme });
    const selectedNodeId = getSelectedNodeId();
    canvas.setNodes(nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    })));
    canvas.setEdges([]);
    repaintGraphCanvasSvgEdges(canvas, projection);
    canvas.requestUpdate();
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
  themeObservers.set(host, observer);
}

function ensureFlowTagsRegistered() {
  if (!customElements.get('flow-canvas')) {
    customElements.define('flow-background', FlowBackground);
    customElements.define('flow-controls', FlowControls);
    customElements.define('flow-canvas', FlowCanvas);
  }
}

function parseProjection(host: HTMLElement): GraphCanvasProjection | null {
  const raw = host.getAttribute('data-graph-canvas-projection');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as GraphCanvasProjection;
  } catch {
    return null;
  }
}

function selectNode(canvas: FlowCanvas, nodeId: string) {
  const nodes = canvas.nodes.map((node) => ({
    ...node,
    selected: node.id === nodeId,
  }));
  canvas.setNodes(nodes);
}

function focusNodeByKeyboard(canvas: FlowCanvas, projection: GraphCanvasProjection, nodeId: string) {
  selectNode(canvas, nodeId);
  canvas.instance.updateNode(nodeId, { selected: true });
  canvas.requestUpdate();
}

function injectFlowCanvasChromeReset(canvas: FlowCanvas) {
  const root = canvas.shadowRoot;
  if (!root || root.querySelector('[data-wg-flow-chrome-reset]')) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute('data-wg-flow-chrome-reset', 'true');
  style.textContent = `
    .edge-label {
      background: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
  `;
  root.appendChild(style);
}

export function mountGraphCanvasLitFlow(host: HTMLElement, options: MountOptions = {}) {
  const previous = mountedHosts.get(host);
  if (previous) {
    unmountGraphCanvasSvgEdges(previous);
    previous.instance?.destroy();
  }
  themeObservers.get(host)?.disconnect();
  themeObservers.delete(host);
  resizeObservers.get(host)?.disconnect();
  resizeObservers.delete(host);
  const previousMinimapHost = minimapHosts.get(host);
  if (previousMinimapHost) {
    unmountGraphCanvasMinimap(previousMinimapHost);
    minimapHosts.delete(host);
  }
  mountedHosts.delete(host);

  ensureFlowTagsRegistered();

  const projection = parseProjection(host);
  if (!projection?.nodes?.length) {
    host.innerHTML = '<div class="empty">Graph projection пуст</div>';
    return;
  }

  const fill = options.fill === true || host.dataset.graphCanvasFill === 'true';
  host.innerHTML = '';
  host.classList.add('graph-canvas-lit-flow-host');
  host.style.position = fill ? 'absolute' : 'relative';
  host.style.width = '100%';
  if (fill) {
    host.style.inset = '0';
    host.style.height = '100%';
    host.style.minHeight = '0';
  } else {
    const height = options.height ?? Number(host.dataset.graphCanvasHeight ?? 480);
    host.style.minHeight = `${height}px`;
    host.style.height = `${height}px`;
  }

  const shell = document.createElement('div');
  shell.className = 'graph-canvas-lit-flow-shell';
  shell.style.width = '100%';
  shell.style.height = '100%';
  shell.style.position = 'relative';

  const canvas = document.createElement('flow-canvas') as FlowCanvas;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.nodeTypes = { 'graph-card': 'graph-card-node' };

  const background = document.createElement('flow-background');
  background.setAttribute('slot', 'background');

  const theme = resolveGraphCanvasTheme();
  applyGraphCanvasHostTheme(host, theme);
  applyFlowCanvasTheme(canvas, background, theme);

  const controls = document.createElement('flow-controls');
  const minimapHost = document.createElement('div');
  minimapHost.className = 'graph-canvas-minimap-host';

  canvas.appendChild(background);
  canvas.appendChild(controls);
  canvas.appendChild(minimapHost);
  shell.appendChild(canvas);
  host.appendChild(shell);
  minimapHosts.set(host, minimapHost);

  const { nodes } = graphCanvasProjectionToFlow(projection, { theme });
  let selectedNodeId = projection.nodes[0]?.id ?? '';

  const applyGraph = () => {
    canvas.setNodes(nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    })));
    canvas.setEdges([]);
  };

  customElements.whenDefined('flow-canvas').then(() => {
    injectFlowCanvasChromeReset(canvas);
    injectFlowCanvasNativeEdgeHide(canvas);
    applyGraph();
    mountGraphCanvasSvgEdges(canvas, projection);
    controls.instance = canvas.instance;
    mountGraphCanvasMinimap(minimapHost, () => canvas, {
      width: 168,
      height: 108,
      theme,
    });
    watchGraphCanvasTheme(host, canvas, background, projection, () => selectedNodeId);
    window.requestAnimationFrame(() => {
      canvas.instance.fitView();
    });
    if (fill) {
      const resizeTarget = host.parentElement ?? host;
      const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(() => {
          canvas.instance?.fitView({ padding: 0.12, duration: 0 });
        });
      });
      observer.observe(resizeTarget);
      resizeObservers.set(host, observer);
    }
  });

  host.addEventListener('graph-node-click', (event) => {
    const detail = (event as CustomEvent).detail ?? {};
    if (detail.nodeId) {
      selectedNodeId = detail.nodeId;
      selectNode(canvas, selectedNodeId);
    }
    host.dispatchEvent(new CustomEvent('workgraph-graph-node-click', {
      bubbles: true,
      detail,
    }));
  });

  host.tabIndex = 0;
  host.addEventListener('keydown', (event) => {
    if (!selectedNodeId) {
      return;
    }

    let nextId = selectedNodeId;
    if (event.key === 'ArrowRight') {
      const outgoing = getOutgoingNodeIds(selectedNodeId, projection.edges);
      nextId = outgoing[0] ?? selectedNodeId;
    } else if (event.key === 'ArrowLeft') {
      const incoming = getIncomingNodeIds(selectedNodeId, projection.edges);
      nextId = incoming[0] ?? selectedNodeId;
    } else if (event.key === 'ArrowDown') {
      const siblings = getSiblingNodeIds(selectedNodeId, projection.edges, projection.nodes);
      const downstream = getDownstreamNodeIds(selectedNodeId, projection.edges);
      const candidates = sortNodeIdsByVerticalPosition([...siblings, ...downstream], projection.nodes)
        .filter((id) => id !== selectedNodeId);
      nextId = candidates[0] ?? selectedNodeId;
    } else if (event.key === 'ArrowUp') {
      const upstream = getUpstreamNodeIds(selectedNodeId, projection.edges);
      nextId = upstream[0] ?? selectedNodeId;
    } else if (event.key === 'Enter') {
      host.dispatchEvent(new CustomEvent('workgraph-graph-node-click', {
        bubbles: true,
        detail: {
          nodeId: selectedNodeId,
          ...(nodes.find((node) => node.id === selectedNodeId)?.data ?? {}),
        },
      }));
      return;
    } else {
      return;
    }

    event.preventDefault();
    if (nextId !== selectedNodeId) {
      selectedNodeId = nextId;
      focusNodeByKeyboard(canvas, projection, selectedNodeId);
    }
  });

  mountedHosts.set(host, canvas);
}

export function mountAllGraphCanvasLitFlowHosts(root: ParentNode = document) {
  for (const host of root.querySelectorAll<HTMLElement>('[data-graph-canvas-projection]')) {
    mountGraphCanvasLitFlow(host);
  }
}

declare global {
  interface Window {
    __WORKGRAPH_MOUNT_GRAPH_CANVAS__?: typeof mountAllGraphCanvasLitFlowHosts;
  }
}

window.__WORKGRAPH_MOUNT_GRAPH_CANVAS__ = mountAllGraphCanvasLitFlowHosts;
