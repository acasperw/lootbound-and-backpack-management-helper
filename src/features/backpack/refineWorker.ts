/**
 * Background buff-refinement worker.
 *
 * Runs the deeper simulated-annealing pass off the main thread so the UI stays
 * responsive, reporting progress and a final improved layout. See {@link refine}.
 *
 * @author Backpack Helper
 */

import { refine } from '@/lib/solver';
import type { BackpackConfig, ItemDefinition, PlacedItem } from '@/types/backpack';

/** Message posted to the worker to start a refinement run. */
export interface RefineRequest {
  config: BackpackConfig;
  items: ItemDefinition[];
  placements: PlacedItem[];
  iterations: number;
  seed?: number;
}

/** Messages the worker posts back. */
export type RefineResponse =
  | { type: 'progress'; value: number }
  | { type: 'result'; placements: PlacedItem[]; buffScore: number };

// Minimal typed view of the dedicated-worker scope (avoids the WebWorker lib).
const ctx = self as unknown as {
  postMessage: (message: RefineResponse) => void;
  onmessage: ((event: MessageEvent<RefineRequest>) => void) | null;
};

ctx.onmessage = (event) => {
  const { config, items, placements, iterations, seed } = event.data;
  let lastPercent = -1;

  const result = refine(config, items, placements, {
    iterations,
    seed,
    onProgress: (value) => {
      const percent = Math.floor(value * 100);
      if (percent !== lastPercent) {
        lastPercent = percent;
        ctx.postMessage({ type: 'progress', value });
      }
    },
  });

  ctx.postMessage({
    type: 'result',
    placements: result.placements,
    buffScore: result.buffScore,
  });
};
