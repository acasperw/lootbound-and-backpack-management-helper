/**
 * Core domain types for the backpack management helper.
 *
 * The model is intentionally grid-agnostic: a backpack is a `cols × rows`
 * area with a boolean usability mask, so non-rectangular layouts (L-shapes,
 * cut corners, etc.) are supported without special-casing.
 *
 * @author Backpack Helper
 */

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'quest'
  | 'misc';

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

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
  category: ItemCategory;
  rarity: ItemRarity;
  /** Base (un-rotated) occupancy shape. */
  shape: ShapeMatrix;
  /** CSS color used to render the item's cells. */
  color: string;
  /** Solver placement rules. */
  constraints: ItemConstraints;
  /** Higher values are packed first and dropped last when space is tight. */
  priority: number;
  weight?: number;
  value?: number;
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
