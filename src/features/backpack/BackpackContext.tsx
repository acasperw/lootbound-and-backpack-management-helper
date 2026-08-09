import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buildOccupancy, rotateShape, canPlaceShape } from '@/lib/grid';
import { solve } from '@/lib/solver';
import { loadStash, saveStash } from '@/lib/storage';
import { DEFAULT_BACKPACK, STARTER_STASH } from '@/features/backpack/itemCatalog';
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

export interface BackpackContextValue {
  config: BackpackConfig;
  definitions: readonly ItemDefinition[];
  definitionsById: ReadonlyMap<string, ItemDefinition>;
  placed: readonly PlacedItem[];
  /** Cell key → occupying instance id, derived from {@link placed}. */
  occupancy: ReadonlyMap<string, string>;
  held: HeldItem | null;
  /** Ids of stash items the last auto-fit could not place. */
  unplaced: readonly string[];

  addItem: (item: ItemDefinition) => void;
  removeItem: (id: string) => void;
  /** Change an item's packing priority. */
  setItemPriority: (id: string, priority: number) => void;
  /** Run the auto-fit solver and apply the resulting placements. */
  autoFit: () => void;
  /** Clear all placements without touching the stash. */
  clearPlacements: () => void;

  pickUpFromPalette: (definitionId: string) => void;
  pickUpPlaced: (instanceId: string) => void;
  rotateHeld: () => void;
  /** Attempt to place the held item; returns whether placement succeeded. */
  placeAt: (x: number, y: number) => boolean;
  returnHeld: () => void;
  removePlaced: (instanceId: string) => void;
  /** Restore the full default state: starter stash, empty grid, nothing held. */
  reset: () => void;

  /** Whether the held item can currently be placed at the given anchor. */
  canPlaceHeldAt: (x: number, y: number) => boolean;
}

const BackpackContext = createContext<BackpackContextValue | null>(null);

const nextRotation = (rotation: Rotation): Rotation =>
  (((rotation + 90) % 360) as Rotation);

const createInstanceId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`;

/**
 * Provides backpack state (layout, placed items, held item) and the actions
 * that mutate it. Consumed via the {@link useBackpack} hook.
 */
export function BackpackProvider({ children }: { children: ReactNode }) {
  const [config] = useState<BackpackConfig>(DEFAULT_BACKPACK);
  const [definitions, setDefinitions] = useState<ItemDefinition[]>(
    () => loadStash() ?? [...STARTER_STASH],
  );
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [held, setHeld] = useState<HeldItem | null>(null);
  const [unplaced, setUnplaced] = useState<string[]>([]);

  // Persist the stash so it survives a page refresh.
  useEffect(() => {
    saveStash(definitions);
  }, [definitions]);

  const definitionsById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );

  const occupancy = useMemo(
    () => buildOccupancy(placed, definitionsById),
    [placed, definitionsById],
  );

  const addItem = useCallback((item: ItemDefinition) => {
    setDefinitions((current) => [...current, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setDefinitions((current) => current.filter((item) => item.id !== id));
    setPlaced((current) => current.filter((item) => item.definitionId !== id));
    setUnplaced((current) => current.filter((itemId) => itemId !== id));
    setHeld((current) => (current?.definitionId === id ? null : current));
  }, []);

  const setItemPriority = useCallback((id: string, priority: number) => {
    setDefinitions((current) =>
      current.map((item) => (item.id === id ? { ...item, priority } : item)),
    );
  }, []);

  const autoFit = useCallback(() => {
    const result = solve(config, definitions);
    setPlaced(result.placements);
    setUnplaced(result.unplaced);
    setHeld(null);
  }, [config, definitions]);

  // Re-pack automatically whenever the stash or layout changes.
  useEffect(() => {
    autoFit();
  }, [autoFit]);

  const clearPlacements = useCallback(() => {
    setPlaced([]);
    setUnplaced([]);
  }, []);

  const pickUpFromPalette = useCallback((definitionId: string) => {
    setHeld({
      source: 'palette',
      instanceId: createInstanceId(),
      definitionId,
      rotation: 0,
    });
  }, []);

  const pickUpPlaced = useCallback((instanceId: string) => {
    setPlaced((current) => {
      const target = current.find((item) => item.instanceId === instanceId);
      if (target) {
        setHeld({
          source: 'placed',
          instanceId: target.instanceId,
          definitionId: target.definitionId,
          rotation: target.rotation,
        });
        return current.filter((item) => item.instanceId !== instanceId);
      }
      return current;
    });
  }, []);

  const rotateHeld = useCallback(() => {
    setHeld((current) =>
      current ? { ...current, rotation: nextRotation(current.rotation) } : current,
    );
  }, []);

  const canPlaceHeldAt = useCallback(
    (x: number, y: number): boolean => {
      if (!held) return false;
      const definition = definitionsById.get(held.definitionId);
      if (!definition) return false;
      const shape = rotateShape(definition.shape, held.rotation);
      return canPlaceShape(config, occupancy, shape, x, y, held.instanceId);
    },
    [held, definitionsById, config, occupancy],
  );

  const placeAt = useCallback(
    (x: number, y: number): boolean => {
      if (!held || !canPlaceHeldAt(x, y)) return false;
      setPlaced((current) => [
        ...current,
        {
          instanceId: held.instanceId,
          definitionId: held.definitionId,
          x,
          y,
          rotation: held.rotation,
        },
      ]);
      setHeld(null);
      return true;
    },
    [held, canPlaceHeldAt],
  );

  const returnHeld = useCallback(() => setHeld(null), []);

  const removePlaced = useCallback((instanceId: string) => {
    setPlaced((current) => current.filter((item) => item.instanceId !== instanceId));
  }, []);

  const reset = useCallback(() => {
    setDefinitions([]);
    setPlaced([]);
    setHeld(null);
    setUnplaced([]);
  }, []);

  const value = useMemo<BackpackContextValue>(
    () => ({
      config,
      definitions,
      definitionsById,
      placed,
      occupancy,
      held,
      unplaced,
      addItem,
      removeItem,
      setItemPriority,
      autoFit,
      clearPlacements,
      pickUpFromPalette,
      pickUpPlaced,
      rotateHeld,
      placeAt,
      returnHeld,
      removePlaced,
      reset,
      canPlaceHeldAt,
    }),
    [
      config,
      definitions,
      definitionsById,
      placed,
      occupancy,
      held,
      unplaced,
      addItem,
      removeItem,
      setItemPriority,
      autoFit,
      clearPlacements,
      pickUpFromPalette,
      pickUpPlaced,
      rotateHeld,
      placeAt,
      returnHeld,
      removePlaced,
      reset,
      canPlaceHeldAt,
    ],
  );

  return <BackpackContext value={value}>{children}</BackpackContext>;
}

/** Access backpack state and actions. Must be used within a provider. */
export function useBackpack(): BackpackContextValue {
  const context = useContext(BackpackContext);
  if (!context) {
    throw new Error('useBackpack must be used within a <BackpackProvider>.');
  }
  return context;
}
