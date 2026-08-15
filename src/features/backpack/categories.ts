/**
 * The category taxonomy shown in the item builder and buff editor.
 *
 * Groups (Weapons, Armor, …) contain concrete leaf types (Hammer, Helmet, …).
 * An item is tagged with a leaf id; a buff may target a leaf id (only that
 * type) or a group id (every type in the group).
 *
 * @author Backpack Helper
 */

import type { CategoryNode } from '@/types/backpack';

/** The full group → leaf taxonomy, in display order. */
export const CATEGORY_TREE: readonly CategoryNode[] = [
  {
    id: 'weapon',
    label: 'Weapons',
    children: [
      { id: 'weapon.sword', label: 'Sword' },
      { id: 'weapon.hammer', label: 'Hammer' },
      { id: 'weapon.staff', label: 'Staff' },
      { id: 'weapon.bow', label: 'Bow' },
      { id: 'weapon.arrow', label: 'Arrow' },
      { id: 'weapon.instrument', label: 'Instrument' },
    ],
  },
  {
    id: 'armor',
    label: 'Armor',
    children: [
      { id: 'armor.hat', label: 'Hat' },
      { id: 'armor.helmet', label: 'Helmet' },
      { id: 'armor.hood', label: 'Hood' },
      { id: 'armor.plate-armor', label: 'Plate Armor' },
      { id: 'armor.mantle', label: 'Mantle' },
      // { id: 'armor.boots', label: 'Boots' },
    ],
  },
  {
    id: 'shield',
    label: 'Shields',
    children: [
      { id: 'shield.shield', label: 'Shield' },
      { id: 'shield.buckler', label: 'Buckler' },
    ],
  },
  { id: 'structure', label: 'Structures' },
  {
    id: 'magic',
    label: 'Magic',
    children: [
      { id: 'magic.wand', label: 'Wand' },
      { id: 'magic.staff', label: 'Staff' },
      { id: 'magic.book', label: 'Book' },
    ],
  },
  {
    id: 'accessory',
    label: 'Accessories',
    children: [
      { id: 'accessory.ring', label: 'Ring' },
      { id: 'accessory.necklace', label: 'Necklace' },
      { id: 'accessory.gem', label: 'Gem' },
    ],
  },
  {
    id: 'consumable',
    label: 'Consumables',
    children: [
      { id: 'consumable.potion', label: 'Potion' },
      { id: 'consumable.food', label: 'Food' },
      { id: 'consumable.fish', label: 'Fish' },
      { id: 'consumable.drink', label: 'Drink' },
    ],
  },
  { id: 'relic', label: 'Relics' },
  { id: 'curse', label: 'Curses' },
  { id: 'misc', label: 'Miscellaneous' },
];

/** Flat lookup from any category id (group or leaf) to its display label. */
const LABELS: ReadonlyMap<string, string> = new Map(
  CATEGORY_TREE.flatMap((group) => [
    [group.id, group.label] as const,
    ...(group.children ?? []).map(
      (leaf) => [leaf.id, leaf.label] as const,
    ),
  ]),
);

/** Every valid category id in the taxonomy (groups and leaves). */
export const CATEGORY_IDS: ReadonlySet<string> = new Set(LABELS.keys());

/**
 * Display label for a category id.
 *
 * @param id - A group or leaf id.
 * @returns The label, or the id itself when unknown.
 */
export function categoryLabel(id: string): string {
  return LABELS.get(id) ?? id;
}

/**
 * Fully-qualified label including the group, e.g. `'Weapons › Hammer'`.
 *
 * @param id - A group or leaf id.
 */
export function categoryPathLabel(id: string): string {
  const dot = id.indexOf('.');
  if (dot === -1) return categoryLabel(id);
  return `${categoryLabel(id.slice(0, dot))} \u203a ${categoryLabel(id)}`;
}
