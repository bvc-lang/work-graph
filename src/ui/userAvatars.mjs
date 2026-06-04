/** Jira-style colored vector avatars (deterministic pick by owner key). */

export const OWNER_AVATAR_AGENT_FILE = 'agent-sparkle.svg';

export const OWNER_AVATAR_FILES = [
  'avatar-01.svg',
  'avatar-02.svg',
  'avatar-03.svg',
  'avatar-04.svg',
  'avatar-05.svg',
  'avatar-06.svg',
  'avatar-07.svg',
  'avatar-08.svg',
  'avatar-09.svg',
  'avatar-10.svg',
];

/**
 * @param {string} value
 */
export function hashOwnerKey(value) {
  let hash = 0;
  const source = String(value ?? 'wg').trim().toLowerCase() || 'wg';
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * @param {string | null | undefined} owner
 */
export function resolveOwnerAvatarFile(owner) {
  const index = hashOwnerKey(owner) % OWNER_AVATAR_FILES.length;
  return OWNER_AVATAR_FILES[index];
}

/**
 * @param {string | null | undefined} value
 */
function escapeAvatarAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * @param {string | null | undefined} owner
 */
export function isAgentOwner(owner) {
  const normalized = String(owner ?? '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return normalized === 'agent'
    || normalized === 'cursor-agent'
    || normalized === 'wg-agent'
    || normalized === 'ai-agent';
}

/**
 * @param {string | null | undefined} owner
 * @param {{ title?: string, className?: string, size?: number }} [options]
 */
export function renderOwnerAvatar(owner, options = {}) {
  const label = options.title ?? owner ?? 'WG';
  const agent = isAgentOwner(owner);
  const className = (options.className ?? 'owner-avatar') + (agent ? ' is-agent' : '');
  const size = options.size ?? 28;
  const fileName = agent ? OWNER_AVATAR_AGENT_FILE : resolveOwnerAvatarFile(owner);
  return '<span class="' + className + '" title="' + escapeAvatarAttr(label) + '">' +
    '<img src="/assets/avatars/' + fileName + '" alt="" width="' + size + '" height="' + size + '" loading="lazy" decoding="async">' +
  '</span>';
}
