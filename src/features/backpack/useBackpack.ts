import { createContext, useContext } from 'react';
import type {
  BackpackConfig,
  ItemDefinition,
  PlacedItem,
  Rotation,
} from '@/types/backpack';

/** An item currently "in hand", awaiting placement on the grid. */
export interface HeldItem {
  /** Where the held item came from. */
  source: 'palette' | 'placed';
  /** Preserved instance id when moving an already-placed item. */
  instanceId: string;
  definitionId: string;
  rotation: Rotation;
}

/** A lightweight view of a stash for tab strips and send menus. */
export interface StashSummary {
  id: string;
  name: string;
  itemCount: number;
}

export interface BackpackContextValue {
  config: BackpackConfig;
  /** Item definitions of the active stash. */
  definitions: readonly ItemDefinition[];
  definitionsById: ReadonlyMap<string, ItemDefinition>;
  /** Placements of the active stash. */
  placed: readonly PlacedItem[];
  /** Cell key → occupying instance id, derived from {@link placed}. */
  occupancy: ReadonlyMap<string, string>;
  held: HeldItem | null;
  /** Ids of active-stash items the last auto-fit could not place. */
  unplaced: readonly string[];

  /** Summaries of every stash, in fixed order. */
  stashes: readonly StashSummary[];
  /** Id of the stash currently shown in the grid and stash panel. */
  activeStashId: string;
  /** Switch the active stash (also drops any held item). */
  setActiveStash: (id: string) => void;
  /** Move an item from the active stash into another stash. */
  moveItemToStash: (itemId: string, targetStashId: string) => void;

  addItem: (item: ItemDefinition) => void;
  /** Replace an existing active-stash item, preserving its id. */
  updateItem: (item: ItemDefinition) => void;
  removeItem: (id: string) => void;
  /** Change an item's packing priority. */
  setItemPriority: (id: string, priority: number) => void;
  /** Run the auto-fit solver and apply the resulting placements. */
  autoFit: () => void;
  /** Clear all placements without touching the stash. */
  clearPlacements: () => void;
  /** Background refinement progress (0–1), or `null` when idle/finished. */
  refineProgress: number | null;

  /** Whether the add/edit drawer is open. */
  editorOpen: boolean;
  /** The item being edited, or `null` when adding a new one. */
  editorItem: ItemDefinition | null;
  /** Open the drawer to add a new item, or edit an existing one by id. */
  openEditor: (itemId?: string) => void;
  closeEditor: () => void;

  pickUpFromPalette: (definitionId: string) => void;
  pickUpPlaced: (instanceId: string) => void;
  rotateHeld: () => void;
  /** Attempt to place the held item; returns whether placement succeeded. */
  placeAt: (x: number, y: number) => boolean;
  returnHeld: () => void;
  removePlaced: (instanceId: string) => void;
  /** Restore the active stash to empty: no items, empty grid, nothing held. */
  reset: () => void;

  /** Whether the held item can currently be placed at the given anchor. */
  canPlaceHeldAt: (x: number, y: number) => boolean;
}

export const BackpackContext = createContext<BackpackContextValue | null>(null);

/** Access backpack state and actions. Must be used within a provider. */
export function useBackpack(): BackpackContextValue {
  const context = useContext(BackpackContext);
  if (!context) {
    throw new Error('useBackpack must be used within a <BackpackProvider>.');
  }
  return context;
}
