/**
 * Pure, framework-agnostic geometry helpers for the backpack grid.
 *
 * These functions have no React or DOM dependencies so they can be unit
 * tested in isolation and reused by a future auto-fit solver.
 *
 * @author Backpack Helper
 */

import type {
  BackpackConfig,
  Cell,
  ItemDefinition,
  PlacedItem,
  Rotation,
  ShapeMatrix,
} from '@/types/backpack';

/** Serialize a cell to a stable map key. */
export const cellKey = (x: number, y: number): string => `${x},${y}`;

/**
 * Build a shape matrix from a compact ASCII drawing.
 *
 * @param rows - Lines where `#`/`X`/`x` mark filled cells and any other
 *   character marks empty space. All rows should be the same length.
 * @returns The parsed {@link ShapeMatrix}.
 * @example
 * parseShape(['.#.', '###']); // a "T" / plus-top shape
 */
export function parseShape(rows: readonly string[]): ShapeMatrix {
  return rows.map((row) =>
    Array.from(row, (char) => char === '#' || char === 'X' || char === 'x'),
  );
}

/** Create a fully-usable rectangular mask of the given size. */
export function createRectMask(cols: number, rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
}

/** Largest grid dimension (in cells) the backpack may span in either axis. */
export const MAX_GRID_SIZE = 10;

/**
 * Resize a mask to `cols × rows`, keeping cells that still fall inside the new
 * bounds and defaulting any newly-exposed cells to usable.
 */
export function resizeMask(
  mask: readonly (readonly boolean[])[],
  cols: number,
  rows: number,
): boolean[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => mask[y]?.[x] ?? true),
  );
}

/**
 * Rotate a shape clockwise by the given rotation.
 *
 * @param shape - The base shape matrix.
 * @param rotation - Clockwise rotation in degrees.
 * @returns A new rotated shape matrix (the input is never mutated).
 */
export function rotateShape(shape: ShapeMatrix, rotation: Rotation): ShapeMatrix {
  const normalized = ((rotation % 360) + 360) % 360;
  let result = shape.map((row) => [...row]);

  for (let turns = normalized / 90; turns > 0; turns -= 1) {
    const height = result.length;
    const width = result[0]?.length ?? 0;
    const rotated: boolean[][] = Array.from({ length: width }, () =>
      Array.from({ length: height }, () => false),
    );

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        rotated[x][height - 1 - y] = result[y][x];
      }
    }
    result = rotated;
  }

  return result;
}

/** Return the filled-cell offsets of a shape relative to its bounding box. */
export function shapeCells(shape: ShapeMatrix): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (shape[y][x]) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

/** Compute the absolute grid cells occupied by a placed item. */
export function placedItemCells(
  placed: PlacedItem,
  definition: ItemDefinition,
): Cell[] {
  const shape = rotateShape(definition.shape, placed.rotation);
  return shapeCells(shape).map((cell) => ({
    x: cell.x + placed.x,
    y: cell.y + placed.y,
  }));
}

/**
 * Map every occupied cell to the instance id occupying it.
 *
 * @param placed - All currently placed items.
 * @param definitionsById - Lookup from definition id to its definition.
 * @returns A map from `"x,y"` cell key to the occupying instance id.
 */
export function buildOccupancy(
  placed: readonly PlacedItem[],
  definitionsById: ReadonlyMap<string, ItemDefinition>,
): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const item of placed) {
    const definition = definitionsById.get(item.definitionId);
    if (!definition) continue;
    for (const cell of placedItemCells(item, definition)) {
      occupancy.set(cellKey(cell.x, cell.y), item.instanceId);
    }
  }
  return occupancy;
}

/** Whether a cell is inside the grid and flagged usable by the mask. */
export function isCellUsable(config: BackpackConfig, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= config.cols || y >= config.rows) return false;
  return config.mask[y]?.[x] === true;
}

/**
 * Check whether a rotated shape can be placed at an anchor.
 *
 * @param config - The backpack layout.
 * @param occupancy - Cell → instance id map of current placements.
 * @param shape - The already-rotated shape to test.
 * @param anchorX - Target top-left x of the shape's bounding box.
 * @param anchorY - Target top-left y of the shape's bounding box.
 * @param ignoreInstanceId - Instance to treat as empty (for moving an item).
 * @returns `true` if every filled cell lands on a free, usable cell.
 */
export function canPlaceShape(
  config: BackpackConfig,
  occupancy: ReadonlyMap<string, string>,
  shape: ShapeMatrix,
  anchorX: number,
  anchorY: number,
  ignoreInstanceId?: string,
): boolean {
  for (const cell of shapeCells(shape)) {
    const x = cell.x + anchorX;
    const y = cell.y + anchorY;
    if (!isCellUsable(config, x, y)) return false;
    const occupant = occupancy.get(cellKey(x, y));
    if (occupant && occupant !== ignoreInstanceId) return false;
  }
  return true;
}

/** Remove fully-empty outer rows and columns so a shape hugs its content. */
export function trimShape(shape: ShapeMatrix): ShapeMatrix {
  const filled = shapeCells(shape);
  if (filled.length === 0) return [[]];

  const minX = Math.min(...filled.map((cell) => cell.x));
  const maxX = Math.max(...filled.map((cell) => cell.x));
  const minY = Math.min(...filled.map((cell) => cell.y));
  const maxY = Math.max(...filled.map((cell) => cell.y));

  const trimmed: boolean[][] = [];
  for (let y = minY; y <= maxY; y += 1) {
    const row: boolean[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      row.push(shape[y]?.[x] === true);
    }
    trimmed.push(row);
  }
  return trimmed;
}

/** Whether two shape matrices have identical dimensions and filled cells. */
export function shapesEqual(a: ShapeMatrix, b: ShapeMatrix): boolean {
  if (a.length !== b.length) return false;
  for (let y = 0; y < a.length; y += 1) {
    if (a[y].length !== b[y].length) return false;
    for (let x = 0; x < a[y].length; x += 1) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

/**
 * Return the distinct orientations of a shape.
 *
 * @param shape - The base shape.
 * @param allowRotation - When false, only the un-rotated shape is returned.
 * @returns Trimmed, de-duplicated orientations with their rotation angle.
 */
export function uniqueOrientations(
  shape: ShapeMatrix,
  allowRotation: boolean,
): Array<{ rotation: Rotation; shape: ShapeMatrix }> {
  const rotations: Rotation[] = allowRotation ? [0, 90, 180, 270] : [0];
  const result: Array<{ rotation: Rotation; shape: ShapeMatrix }> = [];

  for (const rotation of rotations) {
    const rotated = trimShape(rotateShape(shape, rotation));
    if (!result.some((entry) => shapesEqual(entry.shape, rotated))) {
      result.push({ rotation, shape: rotated });
    }
  }
  return result;
}

/**
 * Whether all filled cells of a shape form a single 4-connected region.
 *
 * @param shape - The shape matrix to test.
 * @returns `true` if the shape has at least one cell and is contiguous.
 */
export function isContiguous(shape: ShapeMatrix): boolean {
  const filled = shapeCells(shape);
  if (filled.length === 0) return false;

  const present = new Set(filled.map((cell) => cellKey(cell.x, cell.y)));
  const seen = new Set<string>();
  const stack: Cell[] = [filled[0]];
  seen.add(cellKey(filled[0].x, filled[0].y));

  while (stack.length > 0) {
    const { x, y } = stack.pop() as Cell;
    const neighbours: Cell[] = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
    for (const next of neighbours) {
      const key = cellKey(next.x, next.y);
      if (present.has(key) && !seen.has(key)) {
        seen.add(key);
        stack.push(next);
      }
    }
  }

  return seen.size === filled.length;
}
