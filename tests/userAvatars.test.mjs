import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  hashOwnerKey,
  isAgentOwner,
  OWNER_AVATAR_AGENT_FILE,
  OWNER_AVATAR_FILES,
  renderOwnerAvatar,
  resolveOwnerAvatarFile,
} from '../src/ui/userAvatars.mjs';

describe('userAvatars', () => {
  it('resolves deterministic avatar file for owner key', () => {
    const first = resolveOwnerAvatarFile('feature_engineer');
    const second = resolveOwnerAvatarFile('feature_engineer');
    const other = resolveOwnerAvatarFile('platform_engineer');
    assert.equal(first, second);
    assert.ok(OWNER_AVATAR_FILES.includes(first));
    assert.ok(OWNER_AVATAR_FILES.includes(other));
  });

  it('hashes owner keys consistently', () => {
    assert.equal(hashOwnerKey('QA'), hashOwnerKey('qa'));
    assert.notEqual(hashOwnerKey('qa'), hashOwnerKey('dev'));
  });

  it('renders owner avatar img markup', () => {
    const html = renderOwnerAvatar('feature_engineer', { title: 'Feature engineer' });
    assert.match(html, /class="owner-avatar"/);
    assert.match(html, /src="\/assets\/avatars\/avatar-\d{2}\.svg"/);
    assert.match(html, /title="Feature engineer"/);
    assert.match(html, /width="28"/);
  });

  it('detects agent owners', () => {
    assert.equal(isAgentOwner('agent'), true);
    assert.equal(isAgentOwner('Agent'), true);
    assert.equal(isAgentOwner('feature_engineer'), false);
  });

  it('renders sparkle avatar for agent author', () => {
    const html = renderOwnerAvatar('agent', { title: 'agent' });
    assert.match(html, /class="owner-avatar is-agent"/);
    assert.match(html, new RegExp(`src="/assets/avatars/${OWNER_AVATAR_AGENT_FILE}"`));
  });
});
