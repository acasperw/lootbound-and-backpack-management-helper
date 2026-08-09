/**
 * Core domain types for the backpack management helper.
 *
 * The model is intentionally grid-agnostic: a backpack is a `cols × rows`
 * area with a boolean usability mask, so non-rectangular layouts (L-shapes,
 * cut corners, etc.) are supported without special-casing.
 *
 * @author Backpack Helper
 */

/**
 * A node in the category taxonomy. Top-level nodes are groups (e.g. Weapons);
 * their {@link CategoryNode.children} are the concrete leaf types (e.g. Hammer).
 *
 * Ids use dot notation so a leaf encodes its group: `'weapon.hammer'` belongs
 * to the `'weapon'` group. This lets a buff target either a whole group
 * (`'weapon'` → all weapons) or a single leaf (`'weapon.hammer'` → only hammers)
 * without carrying the tree around.
 */
export interface CategoryNode {
  /** Stable id: a group id (`'weapon'`) or dotted leaf id (`'weapon.hammer'`). */
  id: string;
  /** Human-readable label, e.g. `'Weapons'` or `'Hammer'`. */
  label: string;
  /** Leaf types belonging to this group, when the node is a group. */
  children?: readonly CategoryNode[];
}

/**
 * A shape occupancy matrix in row-major order (`matrix[y][x]`).
 * `true` marks a filled cell; `false` marks empty space within the
 * shape's bounding box.
 */
export type ShapeMatrix = readonly (readonly boolean[])[];

/** Clockwise rotation in degrees. */
export type Rotation = 0 | 90 | 180 | 270;

/** A backpack boundary an item may be constrained to touch. */
export type EdgeConstraint = 'top' | 'bottom' | 'left' | 'right';

/** The eight compass directions a buff can radiate from its source item. */
export type BuffDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/**
 * How far a buff extends in a given direction:
 * - `'none'`  – no effect that way.
 * - `'one'`   – only the single adjacent tile (one dot).
 * - `'ray'`   – every tile in that direction to the grid edge (two dots).
 */
export type BuffReach = 'none' | 'one' | 'ray';

/** Per-direction reach describing a buff's coverage around its source. */
export type BuffPattern = Record<BuffDirection, BuffReach>;

/**
 * A positional buff an item projects onto neighbouring items of a target
 * category. The solver will later use {@link ItemBuff.amount} to score
 * placements that put buffed items inside {@link ItemBuff.pattern}.
 */
export interface ItemBuff {
  /** Unique id for this buff within its item. */
  id: string;
  /**
   * Category the buff applies to: a group id (`'weapon'` → all weapons) or a
   * leaf id (`'weapon.hammer'` → only hammers).
   */
  target: string;
  /** Directional coverage of the buff around the source item. */
  pattern: BuffPattern;
  /**
   * Solver weight: how strongly auto-fit is pulled toward placing a matching
   * item inside {@link ItemBuff.pattern}. This is a positioning weight, not the
   * item's packing {@link ItemDefinition.priority} (which decides inclusion).
   */
  amount: number;
  /** Optional flavour describing the effect, e.g. `'Slash Damage'`. */
  label?: string;
}

/**
 * Placement rules the auto-fit solver must respect for an item.
 */
export interface ItemConstraints {
  /** Whether the solver may rotate the item (all 90° orientations). */
  allowRotation: boolean;
  /** A single edge the item must touch, or `null` for no requirement. */
  edge: EdgeConstraint | null;
}

/** A cell coordinate on the backpack grid. */
export interface Cell {
  x: number;
  y: number;
}

/**
 * A catalog entry describing a kind of item. Definitions are immutable
 * templates; individual placements are represented by {@link PlacedItem}.
 */
export interface ItemDefinition {
  id: string;
  name: string;
  /** Taxonomy id of this item's type, e.g. `'weapon.hammer'`. */
  categoryId: string;
  /** Base (un-rotated) occupancy shape. */
  shape: ShapeMatrix;
  /** CSS color used to render the item's cells. */
  color: string;
  /** Solver placement rules. */
  constraints: ItemConstraints;
  /** Higher values are packed first and dropped last when space is tight. */
  priority: number;
  /** Positional buffs this item projects onto neighbouring items. */
  buffs?: readonly ItemBuff[];
  weight?: number;
  value?: number;
}

/**
 * A named inventory: its own list of item definitions plus the placements and
 * unplaced ids produced by packing them into the backpack. Each stash packs
 * independently of the others.
 */
export interface Stash {
  id: string;
  name: string;
  items: ItemDefinition[];
  placed: PlacedItem[];
  /** Ids of items the last auto-fit could not place in this stash. */
  unplaced: string[];
}

/** A concrete instance of an item positioned on the backpack grid. */
export interface PlacedItem {
  /** Unique id for this placement (a definition may be placed many times). */
  instanceId: string;
  definitionId: string;
  /** Top-left anchor of the (rotated) shape's bounding box. */
  x: number;
  y: number;
  rotation: Rotation;
}

/**
 * The backpack area. `mask[y][x] === true` means a cell can hold items;
 * `false` means the cell is unavailable (used for non-rectangular shapes).
 */
export interface BackpackConfig {
  cols: number;
  rows: number;
  mask: readonly (readonly boolean[])[];
}
