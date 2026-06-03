import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDetailDrawerStack,
  createDetailStackRendererRegistry,
  DETAIL_STACK_FRAME_SCHEMA,
} from '../src/detailDrawerStack.mjs';

describe('createDetailDrawerStack', () => {
  it('push/pop depth correct', () => {
    const stack = createDetailDrawerStack();
    assert.equal(stack.depth(), 0);
    stack.push({ type: 'task', key: 'a', title: 'Task A', payload: { workId: 'a' } });
    assert.equal(stack.depth(), 1);
    stack.push({ type: 'task', key: 'b', title: 'Task B', payload: { workId: 'b' } });
    assert.equal(stack.depth(), 2);
    assert.equal(stack.peek()?.key, 'b');
    assert.equal(stack.peekBelow()?.key, 'a');
    stack.pop();
    assert.equal(stack.depth(), 1);
    assert.equal(stack.peek()?.key, 'a');
    stack.reset();
    assert.equal(stack.depth(), 0);
  });

  it('assigns default frame schema', () => {
    const stack = createDetailDrawerStack();
    stack.push({ type: 'task', key: 'x', payload: { workId: 'x' } });
    assert.equal(stack.peek()?.schema, DETAIL_STACK_FRAME_SCHEMA);
  });

  it('supports depth greater than two without losing frames', () => {
    const stack = createDetailDrawerStack();
    stack.push({ type: 'analytics', key: 'a1', title: 'A1', payload: { recordId: 'a1' } });
    stack.push({ type: 'analytics', key: 'a2', title: 'A2', payload: { recordId: 'a2' } });
    stack.push({ type: 'task', key: 't1', title: 'T1', payload: { workId: 't1' } });
    stack.push({ type: 'analytics', key: 'a3', title: 'A3', payload: { recordId: 'a3' } });
    assert.equal(stack.depth(), 4);
    assert.deepEqual(stack.getFrames().map((frame) => frame.key), ['a1', 'a2', 't1', 'a3']);
    stack.pop();
    assert.equal(stack.peek()?.key, 't1');
    assert.equal(stack.depth(), 3);
  });

  it('throws when frame.type missing', () => {
    const stack = createDetailDrawerStack();
    assert.throws(() => stack.push({ key: 'bad' }), /frame\.type is required/);
  });
});

describe('createDetailStackRendererRegistry', () => {
  it('unknown type throws clear error', async () => {
    const registry = createDetailStackRendererRegistry();
    await assert.rejects(
      () => registry.renderFrame({ type: 'missing', payload: {} }),
      /Unknown detail stack frame type: missing/,
    );
  });

  it('renders registered frame type', async () => {
    const registry = createDetailStackRendererRegistry();
    registry.register('task', async (frame) => frame.payload.workId);
    const result = await registry.renderFrame({
      type: 'task',
      payload: { workId: 'implement-foo' },
    });
    assert.equal(result, 'implement-foo');
  });
});
