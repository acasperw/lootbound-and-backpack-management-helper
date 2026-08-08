/**
 * Auto-fit solver: attempts to pack a set of items into a backpack while
 * honouring per-item rotation and edge constraints.
 *
 * The search is a depth-first backtracker that maximises the number of placed
 * items. It updates a running "best" partial solution as it goes and is capped
 * by an expansion budget, so it always returns a usable result even when a
 * perfect packing is impossible or too expensive to find.
 *
 * All geometry is pure and framework-agnostic.
 *
 * @author Backpack Helper
 */

import { rotateShape, shapeCells, trimShape, uniqueOrientations } from '@/lib/grid';
import type {
  BackpackConfig,
  EdgeConstraint,
  ItemDefinition,
  PlacedItem,
  Rotation,
} from '@/types/backpack';

export interface SolveResult {
  /** Successful placements for as many items as could be fit. */
  placements: PlacedItem[];
  /** Ids of items that could not be placed. */
  unplaced: string[];
  /** Whether every input item was placed. */
  solvedAll: boolean;
}

interface Orientation {
  rotation: Rotation;
  width: number;
  height: number;
  /** Filled-cell offsets relative to the shape's top-left. */
  offsets: ReadonlyArray<{ dx: number; dy: number }>;
}

interface PreparedItem {
  id: string;
  edge: EdgeConstraint | null;
  priority: number;
  area: number;
  orientations: Orientation[];
}

/** Default cap on search-node expansions to keep solving responsive. */
const DEFAULT_BUDGET = 300_000;

function prepareItem(item: ItemDefinition): PreparedItem {
  const orientations = uniqueOrientations(item.shape, item.constraints.allowRotation).map(
    ({ rotation }) => {
      const shape = trimShape(rotateShape(item.shape, rotation));
      const cells = shapeCells(shape);
      return {
        rotation,
        width: shape[0]?.length ?? 0,
        height: shape.length,
        offsets: cells.map((cell) => ({ dx: cell.x, dy: cell.y })),
      } satisfies Orientation;
    },
  );

  const area = orientations[0]?.offsets.length ?? 0;
  return {
    id: item.id,
    edge: item.constraints.edge,
    priority: item.priority,
    area,
    orientations,
  };
}

/**
 * Anchor range allowed for an orientation given the item's edge constraint.
 * Trimmed shapes hug their content, so touching an edge reduces to fixing the
 * bounding-box anchor against that edge.
 *
 * @returns The inclusive [min, max] anchor ranges, or `null` if the
 *   constraint is unsatisfiable for this orientation.
 */
function anchorRange(
  orientation: Orientation,
  edge: EdgeConstraint | null,
  config: BackpackConfig,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  let minX = 0;
  let maxX = config.cols - orientation.width;
  let minY = 0;
  let maxY = config.rows - orientation.height;

  if (maxX < 0 || maxY < 0) return null;

  switch (edge) {
    case 'left':
      maxX = 0;
      break;
    case 'right':
      minX = config.cols - orientation.width;
      break;
    case 'top':
      maxY = 0;
      break;
    case 'bottom':
      minY = config.rows - orientation.height;
      break;
    default:
      break;
  }

  if (minX > maxX || minY > maxY) return null;
  return { minX, maxX, minY, maxY };
}

/**
 * Pack items into the backpack.
 *
 * The search maximises total placed **priority** first (so high-priority items
 * are kept and low-priority ones are dropped when space runs out), then
 * minimises a top-left "gravity" cost to favour the tightest packing.
 *
 * @param config - The backpack layout (supports non-rectangular masks).
 * @param items - The items to place.
 * @param budget - Optional cap on search-node expansions.
 */
export function solve(
  config: BackpackConfig,
  items: readonly ItemDefinition[],
  budget: number = DEFAULT_BUDGET,
): SolveResult {
  const { cols, rows } = config;
  const usable = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (config.mask[y]?.[x]) usable[y * cols + x] = 1;
    }
  }

  // High priority first, then most-constrained, then largest for tight packing.
  const prepared = items
    .map(prepareItem)
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        Number(b.edge !== null) - Number(a.edge !== null) ||
        b.area - a.area,
    );

  // Suffix sums of priority for search pruning.
  const suffixPriority = new Array<number>(prepared.length + 1).fill(0);
  for (let i = prepared.length - 1; i >= 0; i -= 1) {
    suffixPriority[i] = suffixPriority[i + 1] + prepared[i].priority;
  }

  const occ = new Uint8Array(cols * rows);
  const current: PlacedItem[] = [];
  const best = {
    priority: -1,
    cost: Number.POSITIVE_INFINITY,
    placements: [] as PlacedItem[],
  };
  let remainingBudget = budget;

  const canPlace = (orientation: Orientation, ax: number, ay: number): boolean => {
    for (const { dx, dy } of orientation.offsets) {
      const idx = (ay + dy) * cols + (ax + dx);
      if (usable[idx] === 0 || occ[idx] === 1) return false;
    }
    return true;
  };

  const setOccupied = (orientation: Orientation, ax: number, ay: number, value: number) => {
    for (const { dx, dy } of orientation.offsets) {
      occ[(ay + dy) * cols + (ax + dx)] = value;
    }
  };

  const placementCost = (orientation: Orientation, ax: number, ay: number): number => {
    let cost = 0;
    for (const { dx, dy } of orientation.offsets) {
      cost += (ay + dy) * cols + (ax + dx);
    }
    return cost;
  };

  const consider = (placedPriority: number, cost: number) => {
    if (
      placedPriority > best.priority ||
      (placedPriority === best.priority && cost < best.cost)
    ) {
      best.priority = placedPriority;
      best.cost = cost;
      best.placements = current.slice();
    }
  };

  const dfs = (index: number, placedPriority: number, cost: number): void => {
    consider(placedPriority, cost);
    if (index >= prepared.length) return;
    if (remainingBudget <= 0) return;
    // Cannot beat the best priority even if every remaining item fits.
    if (placedPriority + suffixPriority[index] < best.priority) return;

    const item = prepared[index];

    for (const orientation of item.orientations) {
      const range = anchorRange(orientation, item.edge, config);
      if (!range) continue;

      for (let ay = range.minY; ay <= range.maxY; ay += 1) {
        for (let ax = range.minX; ax <= range.maxX; ax += 1) {
          if (remainingBudget <= 0) return;
          remainingBudget -= 1;
          if (!canPlace(orientation, ax, ay)) continue;

          setOccupied(orientation, ax, ay, 1);
          current.push({
            instanceId: item.id,
            definitionId: item.id,
            x: ax,
            y: ay,
            rotation: orientation.rotation,
          });

          dfs(index + 1, placedPriority + item.priority, cost + placementCost(orientation, ax, ay));

          current.pop();
          setOccupied(orientation, ax, ay, 0);
        }
      }
    }

    // Try leaving this item unplaced as well.
    dfs(index + 1, placedPriority, cost);
  };

  dfs(0, 0, 0);

  const placedIds = new Set(best.placements.map((placement) => placement.instanceId));
  const unplaced = prepared
    .map((item) => item.id)
    .filter((id) => !placedIds.has(id));

  return {
    placements: best.placements,
    unplaced,
    solvedAll: unplaced.length === 0,
  };
}
