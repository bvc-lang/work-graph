export const DETAIL_STACK_FRAME_SCHEMA = 'detail-stack.frame.v1';

/**
 * @returns {{
 *   push: (frame: object) => number,
 *   pop: () => object | null,
 *   reset: () => void,
 *   peek: () => object | null,
 *   peekBelow: () => object | null,
 *   depth: () => number,
 *   subscribe: (listener: Function) => () => void,
 *   replaceTop: (frame: object) => number,
 *   getFrames: () => object[],
 * }}
 */
export function createDetailDrawerStack() {
  /** @type {object[]} */
  const frames = [];
  /** @type {Set<Function>} */
  const listeners = new Set();

  function notify() {
    const snapshot = {
      frames: frames.slice(),
      depth: frames.length,
      top: peek(),
      below: peekBelow(),
    };
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function push(frame) {
    if (!frame || typeof frame !== 'object') {
      throw new TypeError('frame must be an object');
    }
    if (!frame.type) {
      throw new TypeError('frame.type is required');
    }
    frames.push({
      ...frame,
      schema: frame.schema ?? DETAIL_STACK_FRAME_SCHEMA,
    });
    notify();
    return frames.length;
  }

  function pop() {
    if (!frames.length) {
      return null;
    }
    const removed = frames.pop();
    notify();
    return removed;
  }

  function reset() {
    if (!frames.length) {
      return;
    }
    frames.length = 0;
    notify();
  }

  function peek() {
    return frames.length ? frames[frames.length - 1] : null;
  }

  function peekBelow() {
    return frames.length > 1 ? frames[frames.length - 2] : null;
  }

  function depth() {
    return frames.length;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function replaceTop(frame) {
    if (!frame || typeof frame !== 'object' || !frame.type) {
      throw new TypeError('frame.type is required');
    }
    if (!frames.length) {
      return push(frame);
    }
    frames[frames.length - 1] = {
      ...frame,
      schema: frame.schema ?? DETAIL_STACK_FRAME_SCHEMA,
    };
    notify();
    return frames.length;
  }

  return {
    push,
    pop,
    reset,
    peek,
    peekBelow,
    depth,
    subscribe,
    replaceTop,
    getFrames: () => frames.slice(),
  };
}

export function createDetailStackRendererRegistry() {
  /** @type {Map<string, Function>} */
  const registry = new Map();

  return {
    register(type, renderer) {
      if (!type || typeof renderer !== 'function') {
        throw new TypeError('register(type, renderer) requires a function renderer');
      }
      registry.set(type, renderer);
    },
    has(type) {
      return registry.has(type);
    },
    async renderFrame(frame, context = {}) {
      if (!frame?.type) {
        throw new TypeError('frame.type is required');
      }
      const renderer = registry.get(frame.type);
      if (!renderer) {
        throw new Error('Unknown detail stack frame type: ' + frame.type);
      }
      return renderer(frame, context);
    },
  };
}
