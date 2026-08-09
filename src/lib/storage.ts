/**
 * localStorage persistence for the user's stash so it survives a page refresh.
 *
 * Stored data is user-controlled, so it is validated and normalised on load;
 * anything malformed is dropped rather than trusted.
 *
 * @author Backpack Helper
 */

import type {
  BuffDirection,
  BuffPattern,
  BuffReach,
  EdgeConstraint,
  ItemBuff,
  ItemDefinition,
  ShapeMatrix,
} from '@/types/backpack';

const STORAGE_KEY = 'lootbound.stash.v1';

const EDGES: readonly EdgeConstraint[] = ['top', 'bottom', 'left', 'right'];
const BUFF_DIRECTIONS: readonly BuffDirection[] = [
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
];
const BUFF_REACHES: readonly BuffReach[] = ['none', 'one', 'ray'];

const isShapeMatrix = (value: unknown): value is ShapeMatrix =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (row) => Array.isArray(row) && row.every((cell) => typeof cell === 'boolean'),
  );

/** Validate a persisted buff pattern, or return `null` when malformed. */
function normalizeBuffPattern(value: unknown): BuffPattern | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  const pattern = {} as BuffPattern;
  for (const direction of BUFF_DIRECTIONS) {
    const reach = source[direction];
    if (typeof reach !== 'string' || !BUFF_REACHES.includes(reach as BuffReach)) {
      return null;
    }
    pattern[direction] = reach as BuffReach;
  }
  return pattern;
}

/** Validate and normalise a single persisted buff, or return `null` if invalid. */
function normalizeBuff(value: unknown): ItemBuff | null {
  if (typeof value !== 'object' || value === null) return null;
  const buff = value as Record<string, unknown>;

  if (typeof buff.id !== 'string' || buff.id.length === 0) return null;
  if (typeof buff.target !== 'string' || buff.target.length === 0) return null;

  const pattern = normalizeBuffPattern(buff.pattern);
  if (!pattern) return null;

  const amount =
    typeof buff.amount === 'number' && Number.isFinite(buff.amount)
      ? Math.max(0, Math.round(buff.amount))
      : 0;
  const label = typeof buff.label === 'string' ? buff.label : undefined;

  return { id: buff.id, target: buff.target, pattern, amount, label };
}

/** Clamp any incoming priority to the supported 1–3 range. */
const normalizePriority = (value: unknown): number => {
  const numeric = typeof value === 'number' ? Math.round(value) : 2;
  return Math.min(3, Math.max(1, numeric));
};

/** Validate and normalise a single persisted item, or return `null` if invalid. */
function normalizeItem(value: unknown): ItemDefinition | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;

  if (typeof item.id !== 'string' || item.id.length === 0) return null;
  if (typeof item.name !== 'string') return null;
  if (typeof item.color !== 'string') return null;
  if (!isShapeMatrix(item.shape)) return null;

  const constraints = item.constraints as Record<string, unknown> | undefined;
  if (!constraints || typeof constraints.allowRotation !== 'boolean') return null;

  const edge =
    typeof constraints.edge === 'string' &&
    EDGES.includes(constraints.edge as EdgeConstraint)
      ? (constraints.edge as EdgeConstraint)
      : null;

  // Prefer the new `categoryId`; fall back to the legacy `category` group id.
  const categoryId =
    typeof item.categoryId === 'string' && item.categoryId.length > 0
      ? item.categoryId
      : typeof item.category === 'string' && item.category.length > 0
        ? item.category
        : 'misc';

  const buffs = Array.isArray(item.buffs)
    ? item.buffs
        .map(normalizeBuff)
        .filter((buff): buff is ItemBuff => buff !== null)
    : [];

  return {
    id: item.id,
    name: item.name,
    categoryId,
    color: item.color,
    priority: normalizePriority(item.priority),
    constraints: { allowRotation: constraints.allowRotation, edge },
    shape: item.shape,
    ...(buffs.length > 0 ? { buffs } : {}),
  };
}

/** Load the persisted stash, or `null` when nothing valid is stored. */
export function loadStash(): ItemDefinition[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .map(normalizeItem)
      .filter((item): item is ItemDefinition => item !== null);
    return items;
  } catch {
    return null;
  }
}

/** Persist the stash. Failures (e.g. quota, private mode) are ignored. */
export function saveStash(items: readonly ItemDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Persistence is best-effort; ignore storage errors.
  }
}

const STASHES_KEY = 'lootbound.stashes.v2';

/** The persisted shape of a stash: only its identity and items are stored. */
export interface StoredStash {
  id: string;
  name: string;
  items: ItemDefinition[];
}

/** Validate and normalise a single persisted stash, or return `null` if invalid. */
function normalizeStash(value: unknown): StoredStash | null {
  if (typeof value !== 'object' || value === null) return null;
  const stash = value as Record<string, unknown>;
  if (typeof stash.id !== 'string' || stash.id.length === 0) return null;
  if (typeof stash.name !== 'string') return null;
  const items = Array.isArray(stash.items)
    ? stash.items
        .map(normalizeItem)
        .filter((item): item is ItemDefinition => item !== null)
    : [];
  return { id: stash.id, name: stash.name, items };
}

/**
 * Load the persisted stashes. Falls back to migrating a legacy single-stash
 * (`v1`) payload into the first stash. Returns `null` when nothing valid is
 * stored so callers can seed their own defaults.
 */
export function loadStashes(): StoredStash[] | null {
  try {
    const raw = localStorage.getItem(STASHES_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stashes = parsed
          .map(normalizeStash)
          .filter((stash): stash is StoredStash => stash !== null);
        if (stashes.length > 0) return stashes;
      }
    }
    // Migrate a legacy single stash into the first slot.
    const legacy = loadStash();
    if (legacy && legacy.length > 0) {
      return [{ id: 'stash-1', name: 'Stash 1', items: legacy }];
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the stashes. Failures (e.g. quota, private mode) are ignored. */
export function saveStashes(stashes: readonly StoredStash[]): void {
  try {
    localStorage.setItem(STASHES_KEY, JSON.stringify(stashes));
  } catch {
    // Persistence is best-effort; ignore storage errors.
  }
}
