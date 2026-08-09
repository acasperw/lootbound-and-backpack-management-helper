import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buildOccupancy, rotateShape, canPlaceShape } from '@/lib/grid';
import { solve } from '@/lib/solver';
import { loadStashes, saveStashes } from '@/lib/storage';
import { DEFAULT_BACKPACK, STARTER_STASH } from '@/features/backpack/itemCatalog';
import {
  BackpackContext,
  type BackpackContextValue,
  type HeldItem,
  type StashSummary,
} from '@/features/backpack/useBackpack';
import type {
  BackpackConfig,
  ItemDefinition,
  Rotation,
  Stash,
} from '@/types/backpack';

const nextRotation = (rotation: Rotation): Rotation =>
  (((rotation + 90) % 360) as Rotation);

const createInstanceId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`;

/** Fixed names for the three stashes. */
const STASH_NAMES = ['Stash 1', 'Stash 2', 'Stash 3'] as const;

/** Seed the three stashes from storage, falling back to the starter stash. */
function initStashes(): Stash[] {
  const stored = loadStashes();
  return STASH_NAMES.map((name, index) => {
    const source = stored?.[index];
    const items = source
      ? [...source.items]
      : index === 0 && !stored
        ? [...STARTER_STASH]
        : [];
    return {
      id: source?.id ?? `stash-${index + 1}`,
      name,
      items,
      placed: [],
      unplaced: [],
    };
  });
}

/**
 * Provides backpack state (three stashes, the active grid, held item, and the
 * add/edit drawer) and the actions that mutate it. Consumed via the
 * {@link useBackpack} hook.
 */
export function BackpackProvider({ children }: { children: ReactNode }) {
  const [config] = useState<BackpackConfig>(DEFAULT_BACKPACK);
  const [stashes, setStashes] = useState<Stash[]>(initStashes);
  const [activeStashId, setActiveStashId] = useState<string>(() => stashes[0].id);
  const [held, setHeld] = useState<HeldItem | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; itemId: string | null }>({
    open: false,
    itemId: null,
  });

  // Persist the stashes so they survive a page refresh (items only).
  useEffect(() => {
    saveStashes(stashes.map(({ id, name, items }) => ({ id, name, items })));
  }, [stashes]);

  const activeStash = useMemo(
    () => stashes.find((stash) => stash.id === activeStashId) ?? stashes[0],
    [stashes, activeStashId],
  );

  const definitions = activeStash.items;
  const placed = activeStash.placed;
  const unplaced = activeStash.unplaced;

  const definitionsById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );

  const occupancy = useMemo(
    () => buildOccupancy(placed, definitionsById),
    [placed, definitionsById],
  );

  /** Apply a shallow patch to the active stash, leaving the others untouched. */
  const patchActive = useCallback(
    (patch: (stash: Stash) => Partial<Stash>) =>
      setStashes((current) =>
        current.map((stash) =>
          stash.id === activeStashId ? { ...stash, ...patch(stash) } : stash,
        ),
      ),
    [activeStashId],
  );

  const stashSummaries = useMemo<StashSummary[]>(
    () => stashes.map(({ id, name, items }) => ({ id, name, itemCount: items.length })),
    [stashes],
  );

  const setActiveStash = useCallback((id: string) => {
    setActiveStashId(id);
    setHeld(null);
  }, []);

  const moveItemToStash = useCallback(
    (itemId: string, targetStashId: string) => {
      if (targetStashId === activeStashId) return;
      setStashes((current) => {
        const source = current.find((stash) => stash.id === activeStashId);
        const item = source?.items.find((candidate) => candidate.id === itemId);
        if (!item) return current;
        return current.map((stash) => {
          if (stash.id === activeStashId) {
            return {
              ...stash,
              items: stash.items.filter((candidate) => candidate.id !== itemId),
              placed: stash.placed.filter((entry) => entry.definitionId !== itemId),
              unplaced: stash.unplaced.filter((id) => id !== itemId),
            };
          }
          if (stash.id === targetStashId) {
            return { ...stash, items: [...stash.items, item] };
          }
          return stash;
        });
      });
      setHeld((current) => (current?.definitionId === itemId ? null : current));
    },
    [activeStashId],
  );

  const addItem = useCallback(
    (item: ItemDefinition) => patchActive((stash) => ({ items: [...stash.items, item] })),
    [patchActive],
  );

  const updateItem = useCallback(
    (item: ItemDefinition) =>
      patchActive((stash) => ({
        items: stash.items.map((candidate) =>
          candidate.id === item.id ? item : candidate,
        ),
      })),
    [patchActive],
  );

  const removeItem = useCallback(
    (id: string) => {
      patchActive((stash) => ({
        items: stash.items.filter((item) => item.id !== id),
        placed: stash.placed.filter((item) => item.definitionId !== id),
        unplaced: stash.unplaced.filter((itemId) => itemId !== id),
      }));
      setHeld((current) => (current?.definitionId === id ? null : current));
    },
    [patchActive],
  );

  const setItemPriority = useCallback(
    (id: string, priority: number) =>
      patchActive((stash) => ({
        items: stash.items.map((item) =>
          item.id === id ? { ...item, priority } : item,
        ),
      })),
    [patchActive],
  );

  const autoFit = useCallback(() => {
    setStashes((current) =>
      current.map((stash) => {
        if (stash.id !== activeStashId) return stash;
        const result = solve(config, stash.items);
        return { ...stash, placed: result.placements, unplaced: result.unplaced };
      }),
    );
    setHeld(null);
  }, [config, activeStashId]);

  // Re-pack the active stash whenever its items change or the active stash switches.
  useEffect(() => {
    autoFit();
  }, [autoFit, definitions]);

  const clearPlacements = useCallback(
    () => patchActive(() => ({ placed: [], unplaced: [] })),
    [patchActive],
  );

  const openEditor = useCallback(
    (itemId?: string) => setEditor({ open: true, itemId: itemId ?? null }),
    [],
  );

  const closeEditor = useCallback(() => setEditor({ open: false, itemId: null }), []);

  const editorItem = useMemo(
    () => (editor.itemId ? definitionsById.get(editor.itemId) ?? null : null),
    [editor.itemId, definitionsById],
  );

  const pickUpFromPalette = useCallback((definitionId: string) => {
    setHeld({
      source: 'palette',
      instanceId: createInstanceId(),
      definitionId,
      rotation: 0,
    });
  }, []);

  const pickUpPlaced = useCallback(
    (instanceId: string) => {
      setStashes((current) =>
        current.map((stash) => {
          if (stash.id !== activeStashId) return stash;
          const target = stash.placed.find((item) => item.instanceId === instanceId);
          if (!target) return stash;
          setHeld({
            source: 'placed',
            instanceId: target.instanceId,
            definitionId: target.definitionId,
            rotation: target.rotation,
          });
          return {
            ...stash,
            placed: stash.placed.filter((item) => item.instanceId !== instanceId),
          };
        }),
      );
    },
    [activeStashId],
  );

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
      const heldItem = held;
      patchActive((stash) => ({
        placed: [
          ...stash.placed,
          {
            instanceId: heldItem.instanceId,
            definitionId: heldItem.definitionId,
            x,
            y,
            rotation: heldItem.rotation,
          },
        ],
      }));
      setHeld(null);
      return true;
    },
    [held, canPlaceHeldAt, patchActive],
  );

  const returnHeld = useCallback(() => setHeld(null), []);

  const removePlaced = useCallback(
    (instanceId: string) =>
      patchActive((stash) => ({
        placed: stash.placed.filter((item) => item.instanceId !== instanceId),
      })),
    [patchActive],
  );

  const reset = useCallback(() => {
    patchActive(() => ({ items: [], placed: [], unplaced: [] }));
    setHeld(null);
  }, [patchActive]);

  const value = useMemo<BackpackContextValue>(
    () => ({
      config,
      definitions,
      definitionsById,
      placed,
      occupancy,
      held,
      unplaced,
      stashes: stashSummaries,
      activeStashId,
      setActiveStash,
      moveItemToStash,
      addItem,
      updateItem,
      removeItem,
      setItemPriority,
      autoFit,
      clearPlacements,
      editorOpen: editor.open,
      editorItem,
      openEditor,
      closeEditor,
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
      stashSummaries,
      activeStashId,
      setActiveStash,
      moveItemToStash,
      addItem,
      updateItem,
      removeItem,
      setItemPriority,
      autoFit,
      clearPlacements,
      editor.open,
      editorItem,
      openEditor,
      closeEditor,
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
