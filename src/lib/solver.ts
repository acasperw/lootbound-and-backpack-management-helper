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

import { placedItemCells, rotateShape, shapeCells, trimShape, uniqueOrientations } from '@/lib/grid';
import { buffTargetMatches } from '@/lib/categories';
import type {
  BackpackConfig,
  BuffDirection,
  BuffPattern,
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

/** A buff resolved for the solver: its target, strength and reach pattern. */
interface PreparedBuff {
  target: string;
  amount: number;
  pattern: BuffPattern;
}

interface PreparedItem {
  id: string;
  categoryId: string;
  edge: EdgeConstraint | null;
  priority: number;
  area: number;
  orientations: Orientation[];
  buffs: PreparedBuff[];
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
    categoryId: item.categoryId,
    edge: item.constraints.edge,
    priority: item.priority,
    area,
    orientations,
    buffs: (item.buffs ?? []).map((buff) => ({
      target: buff.target,
      amount: buff.amount,
      pattern: buff.pattern,
    })),
  };
}

/**
 * Whether an offset from a source cell to a target cell falls within a buff
 * pattern's reach.
 *
 * @param pattern - The buff's per-direction reach.
 * @param ex - Target x minus source x.
 * @param ey - Target y minus source y.
 * @returns `true` when the offset lies along a covered direction and distance.
 */
function offsetInPattern(pattern: BuffPattern, ex: number, ey: number): boolean {
  if (ex === 0 && ey === 0) return false;

  let direction: BuffDirection;
  let distance: number;
  if (ex === 0) {
    direction = ey < 0 ? 'n' : 's';
    distance = Math.abs(ey);
  } else if (ey === 0) {
    direction = ex < 0 ? 'w' : 'e';
    distance = Math.abs(ex);
  } else if (Math.abs(ex) === Math.abs(ey)) {
    direction = ey < 0 ? (ex < 0 ? 'nw' : 'ne') : ex < 0 ? 'sw' : 'se';
    distance = Math.abs(ex);
  } else {
    return false;
  }

  const reach = pattern[direction];
  if (reach === 'none') return false;
  if (reach === 'one') return distance === 1;
  return distance >= 1;
}

/** An item's buff-relevant data plus the absolute cells it occupies. */
interface BuffActor {
  categoryId: string;
  buffs: readonly PreparedBuff[];
  cells: ReadonlyArray<{ x: number; y: number }>;
}

/**
 * Buff strength `source` projects onto `target` given both placements: the sum
 * of amounts of `source`'s buffs whose target category matches and whose
 * pattern covers at least one of the target's cells.
 */
function directedBuff(source: BuffActor, target: BuffActor): number {
  if (source.buffs.length === 0) return 0;
  let total = 0;
  for (const buff of source.buffs) {
    if (buff.amount === 0) continue;
    if (!buffTargetMatches(buff.target, target.categoryId)) continue;

    let hit = false;
    for (const s of source.cells) {
      for (const t of target.cells) {
        if (offsetInPattern(buff.pattern, t.x - s.x, t.y - s.y)) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    if (hit) total += buff.amount;
  }
  return total;
}

/**
 * Total adjacency-buff score realised by a set of placements.
 *
 * Each unordered pair contributes both directions once, matching the
 * incremental score the solver accumulates while packing.
 *
 * @param placed - The placed items to score.
 * @param definitionsById - Lookup from definition id to its definition.
 */
export function scoreBuffs(
  placed: readonly PlacedItem[],
  definitionsById: ReadonlyMap<string, ItemDefinition>,
): number {
  const actors: BuffActor[] = [];
  for (const item of placed) {
    const definition = definitionsById.get(item.definitionId);
    if (!definition) continue;
    actors.push({
      categoryId: definition.categoryId,
      buffs: definition.buffs ?? [],
      cells: placedItemCells(item, definition),
    });
  }

  let total = 0;
  for (let i = 0; i < actors.length; i += 1) {
    for (let j = i + 1; j < actors.length; j += 1) {
      total += directedBuff(actors[i], actors[j]) + directedBuff(actors[j], actors[i]);
    }
  }
  return total;
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
 * are kept and low-priority ones are dropped when space runs out), then total
 * **buff score** from adjacency buffs (favouring layouts that place buffed
 * items inside their buffers' patterns), then minimises a top-left "gravity"
 * cost to favour the tightest packing.
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

  // Optimistic per-item buff ceiling: every amount it could gain as a source
  // (a matching target exists somewhere) plus as a target. This overestimates
  // (it ignores geometry and double-counts pairs), so suffix sums give a valid
  // upper bound on the extra buff still reachable — safe for pruning.
  const buffPotential = prepared.map((item, i) => {
    let outgoing = 0;
    for (const buff of item.buffs) {
      const hasTarget = prepared.some(
        (other, j) => j !== i && buffTargetMatches(buff.target, other.categoryId),
      );
      if (hasTarget) outgoing += buff.amount;
    }
    let incoming = 0;
    for (let j = 0; j < prepared.length; j += 1) {
      if (j === i) continue;
      for (const buff of prepared[j].buffs) {
        if (buffTargetMatches(buff.target, item.categoryId)) incoming += buff.amount;
      }
    }
    return outgoing + incoming;
  });
  const suffixBuff = new Array<number>(prepared.length + 1).fill(0);
  for (let i = prepared.length - 1; i >= 0; i -= 1) {
    suffixBuff[i] = suffixBuff[i + 1] + buffPotential[i];
  }

  const occ = new Uint8Array(cols * rows);
  const current: PlacedItem[] = [];
  const placedCells: BuffActor[] = [];
  const best = {
    priority: -1,
    buff: -1,
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

  /** Total buff gained by adding `entry` to the already-placed items. */
  const buffDelta = (entry: BuffActor): number => {
    let delta = 0;
    for (const placed of placedCells) {
      delta += directedBuff(entry, placed) + directedBuff(placed, entry);
    }
    return delta;
  };

  const consider = (placedPriority: number, buff: number, cost: number) => {
    if (
      placedPriority > best.priority ||
      (placedPriority === best.priority && buff > best.buff) ||
      (placedPriority === best.priority && buff === best.buff && cost < best.cost)
    ) {
      best.priority = placedPriority;
      best.buff = buff;
      best.cost = cost;
      best.placements = current.slice();
    }
  };

  const dfs = (
    index: number,
    placedPriority: number,
    buff: number,
    cost: number,
  ): void => {
    consider(placedPriority, buff, cost);
    if (index >= prepared.length) return;
    if (remainingBudget <= 0) return;

    const maxPriority = placedPriority + suffixPriority[index];
    // Cannot beat the best priority even if every remaining item fits.
    if (maxPriority < best.priority) return;
    // At best-equal priority, prune when the buff ceiling can't reach it either.
    if (maxPriority === best.priority && buff + suffixBuff[index] < best.buff) return;

    const item = prepared[index];

    // Gather legal placements, then try the highest buff-gain ones first so a
    // buff-rich layout is found early even if the budget stops the search.
    interface Candidate {
      orientation: Orientation;
      ax: number;
      ay: number;
      entry: BuffActor;
      gainedBuff: number;
      cost: number;
    }
    const candidates: Candidate[] = [];

    for (const orientation of item.orientations) {
      const range = anchorRange(orientation, item.edge, config);
      if (!range) continue;

      for (let ay = range.minY; ay <= range.maxY; ay += 1) {
        for (let ax = range.minX; ax <= range.maxX; ax += 1) {
          if (remainingBudget <= 0) break;
          remainingBudget -= 1;
          if (!canPlace(orientation, ax, ay)) continue;

          const cells = orientation.offsets.map(({ dx, dy }) => ({
            x: ax + dx,
            y: ay + dy,
          }));
          const entry: BuffActor = {
            categoryId: item.categoryId,
            buffs: item.buffs,
            cells,
          };
          candidates.push({
            orientation,
            ax,
            ay,
            entry,
            gainedBuff: buffDelta(entry),
            cost: placementCost(orientation, ax, ay),
          });
        }
      }
    }

    candidates.sort((a, b) => b.gainedBuff - a.gainedBuff || a.cost - b.cost);

    for (const candidate of candidates) {
      if (remainingBudget <= 0) return;
      const { orientation, ax, ay, entry, gainedBuff, cost: placeCost } = candidate;

      setOccupied(orientation, ax, ay, 1);
      current.push({
        instanceId: item.id,
        definitionId: item.id,
        x: ax,
        y: ay,
        rotation: orientation.rotation,
      });
      placedCells.push(entry);

      dfs(index + 1, placedPriority + item.priority, buff + gainedBuff, cost + placeCost);

      placedCells.pop();
      current.pop();
      setOccupied(orientation, ax, ay, 0);
    }

    // Try leaving this item unplaced as well.
    dfs(index + 1, placedPriority, buff, cost);
  };

  dfs(0, 0, 0, 0);

  /**
   * Polish the constructive solution with seeded simulated annealing on buff
   * score. Inclusion (which items are placed) is fixed; only positions and
   * orientations move, so it never undoes the priority-optimal packing. It is a
   * no-op when no item projects a buff.
   */
  const refineBuffs = (placements: readonly PlacedItem[]): PlacedItem[] => {
    if (placements.length < 2 || !prepared.some((item) => item.buffs.length > 0)) {
      return placements.slice();
    }

    const byId = new Map(prepared.map((item) => [item.id, item] as const));

    interface Slot {
      item: PreparedItem;
      oi: number;
      ax: number;
      ay: number;
      cells: Array<{ x: number; y: number }>;
    }
    const slots: Slot[] = [];
    for (const placement of placements) {
      const item = byId.get(placement.definitionId);
      if (!item) return placements.slice();
      const oi = Math.max(
        0,
        item.orientations.findIndex((o) => o.rotation === placement.rotation),
      );
      const orientation = item.orientations[oi];
      slots.push({
        item,
        oi,
        ax: placement.x,
        ay: placement.y,
        cells: orientation.offsets.map(({ dx, dy }) => ({
          x: placement.x + dx,
          y: placement.y + dy,
        })),
      });
    }

    const rocc = new Uint8Array(cols * rows);
    for (const slot of slots) {
      for (const { x, y } of slot.cells) rocc[y * cols + x] = 1;
    }

    const actor = (slot: Slot): BuffActor => ({
      categoryId: slot.item.categoryId,
      buffs: slot.item.buffs,
      cells: slot.cells,
    });

    // Buff of all pairs involving slot `i` (each such pair counted once).
    const contribution = (i: number): number => {
      const a = actor(slots[i]);
      let sum = 0;
      for (let j = 0; j < slots.length; j += 1) {
        if (j === i) continue;
        const b = actor(slots[j]);
        sum += directedBuff(a, b) + directedBuff(b, a);
      }
      return sum;
    };
    const cellsCost = (cells: ReadonlyArray<{ x: number; y: number }>): number =>
      cells.reduce((total, { x, y }) => total + y * cols + x, 0);

    let totalBuff = 0;
    for (let i = 0; i < slots.length; i += 1) totalBuff += contribution(i);
    totalBuff /= 2; // each unordered pair is counted from both endpoints
    let totalCost = slots.reduce((sum, slot) => sum + cellsCost(slot.cells), 0);

    // Cost is a sub-unit tie-break so it never outranks an integer buff gain.
    const totalCells = slots.reduce((n, slot) => n + slot.cells.length, 0);
    const costEps = 1 / (rows * cols * totalCells + 1);
    const energy = (buff: number, cost: number): number => -buff + costEps * cost;

    let bestEnergy = energy(totalBuff, totalCost);
    const bestPos = slots.map((slot) => ({ oi: slot.oi, ax: slot.ax, ay: slot.ay }));

    // Deterministic PRNG (mulberry32) so results are stable between runs.
    let seed = (0x9e3779b9 ^ slots.length) >>> 0;
    const rnd = (): number => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const randInt = (n: number): number => Math.floor(rnd() * n);

    const maxAmount = Math.max(
      1,
      ...prepared.flatMap((item) => item.buffs.map((buff) => buff.amount)),
    );
    const ITERATIONS = 20000;
    const coolRate = (0.05 / maxAmount) ** (1 / ITERATIONS);
    let temperature = maxAmount;

    for (let iter = 0; iter < ITERATIONS; iter += 1, temperature *= coolRate) {
      const i = randInt(slots.length);
      const slot = slots[i];
      const noi = randInt(slot.item.orientations.length);
      const orientation = slot.item.orientations[noi];
      const range = anchorRange(orientation, slot.item.edge, config);
      if (!range) continue;

      const nax = range.minX + randInt(range.maxX - range.minX + 1);
      const nay = range.minY + randInt(range.maxY - range.minY + 1);

      // Vacate this item, then test the candidate cells against everything else.
      for (const { x, y } of slot.cells) rocc[y * cols + x] = 0;
      const nextCells: Array<{ x: number; y: number }> = [];
      let ok = true;
      for (const { dx, dy } of orientation.offsets) {
        const x = nax + dx;
        const y = nay + dy;
        const idx = y * cols + x;
        if (usable[idx] === 0 || rocc[idx] === 1) {
          ok = false;
          break;
        }
        nextCells.push({ x, y });
      }
      if (!ok) {
        for (const { x, y } of slot.cells) rocc[y * cols + x] = 1;
        continue;
      }

      const oldContrib = contribution(i);
      const oldCost = cellsCost(slot.cells);
      const saved = { cells: slot.cells, oi: slot.oi, ax: slot.ax, ay: slot.ay };
      slot.cells = nextCells;
      slot.oi = noi;
      slot.ax = nax;
      slot.ay = nay;
      const newContrib = contribution(i);
      const newCost = cellsCost(nextCells);

      const nextBuff = totalBuff + (newContrib - oldContrib);
      const nextCost = totalCost + (newCost - oldCost);
      const delta = energy(nextBuff, nextCost) - energy(totalBuff, totalCost);

      if (delta <= 0 || rnd() < Math.exp(-delta / temperature)) {
        for (const { x, y } of nextCells) rocc[y * cols + x] = 1;
        totalBuff = nextBuff;
        totalCost = nextCost;
        const currentEnergy = energy(totalBuff, totalCost);
        if (currentEnergy < bestEnergy) {
          bestEnergy = currentEnergy;
          for (let k = 0; k < slots.length; k += 1) {
            bestPos[k].oi = slots[k].oi;
            bestPos[k].ax = slots[k].ax;
            bestPos[k].ay = slots[k].ay;
          }
        }
      } else {
        slot.cells = saved.cells;
        slot.oi = saved.oi;
        slot.ax = saved.ax;
        slot.ay = saved.ay;
        for (const { x, y } of saved.cells) rocc[y * cols + x] = 1;
      }
    }

    return slots.map((slot, k) => ({
      instanceId: slot.item.id,
      definitionId: slot.item.id,
      x: bestPos[k].ax,
      y: bestPos[k].ay,
      rotation: slot.item.orientations[bestPos[k].oi].rotation,
    }));
  };

  const finalPlacements = refineBuffs(best.placements);

  const placedIds = new Set(finalPlacements.map((placement) => placement.instanceId));
  const unplaced = prepared
    .map((item) => item.id)
    .filter((id) => !placedIds.has(id));

  return {
    placements: finalPlacements,
    unplaced,
    solvedAll: unplaced.length === 0,
  };
}
