import { parseShape } from '@/lib/grid';
import { createRectMask } from '@/lib/grid';
import type { BackpackConfig, ItemDefinition, ShapeMatrix } from '@/types/backpack';

/** Default backpack: 6 columns wide × 9 rows tall, fully usable. */
export const DEFAULT_BACKPACK: BackpackConfig = {
  cols: 6,
  rows: 9,
  mask: createRectMask(6, 9),
};

/** Named preset shapes offered by the item builder. */
export const PRESET_SHAPES: ReadonlyArray<{ id: string; name: string; shape: ShapeMatrix }> = [
  { id: 'single', name: '1\u00d71', shape: parseShape(['#']) },
  { id: 'domino', name: '1\u00d72', shape: parseShape(['#', '#']) },
  { id: 'line3', name: '1\u00d73', shape: parseShape(['#', '#', '#']) },
  { id: 'square', name: '2\u00d72', shape: parseShape(['##', '##']) },
  { id: 'rect', name: '2\u00d73', shape: parseShape(['###', '###']) },
  { id: 'l-shape', name: 'L', shape: parseShape(['#.', '#.', '##']) },
  { id: 't-shape', name: 'T', shape: parseShape(['###', '.#.']) },
  { id: 's-shape', name: 'S', shape: parseShape(['.##', '##.']) },
  { id: 'plus', name: 'Plus', shape: parseShape(['.#.', '###', '.#.']) },
];

/** Colors offered when creating a new stash item. */
export const ITEM_COLORS: readonly string[] = [
  '#9b2f2a',
  '#c8433f',
  '#c79a5b',
  '#e0a13a',
  '#5fae62',
  '#4f8cd6',
  '#a465d6',
  '#8a94a6',
  '#7a5230',
];

/** Supported priority levels, highest first. */
export const PRIORITY_LEVELS: ReadonlyArray<{ label: string; value: number }> = [
  { label: 'High', value: 3 },
  { label: 'Medium', value: 2 },
  { label: 'Low', value: 1 },
];

/**
 * A starter stash of items with distinct shapes and constraints, inspired by
 * the kinds of gear found in Lootbound. Shapes are authored as ASCII.
 */
export const STARTER_STASH: readonly ItemDefinition[] = [
  {
    id: 'red-hood-cloak',
    name: 'Red Hood Cloak',
    category: 'armor',
    rarity: 'epic',
    color: '#9b2f2a',
    weight: 3,
    value: 320,
    priority: 3,
    constraints: { allowRotation: true, edge: null },
    shape: parseShape([
      '.#.',
      '###',
      '###',
    ]),
  },
  {
    id: 'plate-armor',
    name: 'Plate Armor',
    category: 'armor',
    rarity: 'rare',
    color: '#8a94a6',
    weight: 8,
    value: 450,
    priority: 2,
    constraints: { allowRotation: false, edge: null },
    shape: parseShape([
      '###',
      '###',
    ]),
  },
  {
    id: 'health-potion',
    name: 'Health Potion',
    category: 'consumable',
    rarity: 'common',
    color: '#c8433f',
    weight: 1,
    value: 40,
    priority: 1,
    constraints: { allowRotation: true, edge: null },
    shape: parseShape([
      '#',
    ]),
  },
  {
    id: 'gnarled-staff',
    name: 'Gnarled Staff',
    category: 'weapon',
    rarity: 'uncommon',
    color: '#7a5230',
    weight: 4,
    value: 180,
    priority: 1,
    constraints: { allowRotation: true, edge: null },
    shape: parseShape([
      '#.',
      '##',
      '.#',
      '.#',
    ]),
  },
  {
    id: 'iron-mace',
    name: 'Iron Mace',
    category: 'weapon',
    rarity: 'uncommon',
    color: '#9aa0a8',
    weight: 6,
    value: 210,
    priority: 1,
    constraints: { allowRotation: true, edge: null },
    shape: parseShape([
      '#',
      '#',
      '#',
    ]),
  },
  {
    id: 'lute',
    name: 'Bard\u2019s Lute',
    category: 'misc',
    rarity: 'rare',
    color: '#c79a5b',
    weight: 2,
    value: 260,
    priority: 2,
    constraints: { allowRotation: true, edge: null },
    shape: parseShape([
      '.##',
      '###',
    ]),
  },
  {
    id: 'ancient-relic',
    name: 'Ancient Relic',
    category: 'quest',
    rarity: 'legendary',
    color: '#e0a13a',
    weight: 2,
    value: 999,
    priority: 3,
    constraints: { allowRotation: false, edge: 'bottom' },
    shape: parseShape([
      '.#.',
      '###',
      '.#.',
    ]),
  },
];
