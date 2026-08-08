import { useMemo, useState, type CSSProperties } from 'react';
import { useBackpack } from '@/features/backpack/BackpackContext';
import { cellKey, rotateShape, shapeCells } from '@/lib/grid';
import styles from '@/features/backpack/BackpackGrid.module.css';

interface CellState {
  color: string;
  instanceId: string;
}

/**
 * Renders the backpack area as a grid of cells and drives manual placement:
 * hovering with a held item shows a valid/invalid preview, clicking places it,
 * and clicking an occupied cell picks that item back up.
 */
export function BackpackGrid() {
  const {
    config,
    placed,
    definitionsById,
    occupancy,
    held,
    placeAt,
    pickUpPlaced,
    removePlaced,
    canPlaceHeldAt,
  } = useBackpack();

  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  // Map each occupied cell to the color of the item covering it.
  const occupiedCells = useMemo(() => {
    const map = new Map<string, CellState>();
    for (const item of placed) {
      const definition = definitionsById.get(item.definitionId);
      if (!definition) continue;
      for (const [key, instanceId] of occupancy) {
        if (instanceId === item.instanceId) {
          map.set(key, { color: definition.color, instanceId });
        }
      }
    }
    return map;
  }, [placed, definitionsById, occupancy]);

  // Compute the set of cells the held item would cover at the hovered anchor.
  const preview = useMemo(() => {
    if (!held || !hover) return null;
    const definition = definitionsById.get(held.definitionId);
    if (!definition) return null;
    const shape = rotateShape(definition.shape, held.rotation);
    const keys = new Set(
      shapeCells(shape).map((cell) => cellKey(cell.x + hover.x, cell.y + hover.y)),
    );
    return { keys, valid: canPlaceHeldAt(hover.x, hover.y) };
  }, [held, hover, definitionsById, canPlaceHeldAt]);

  const handleActivate = (x: number, y: number) => {
    const key = cellKey(x, y);
    if (held) {
      placeAt(x, y);
      return;
    }
    const occupant = occupiedCells.get(key);
    if (occupant) {
      pickUpPlaced(occupant.instanceId);
    }
  };

  const rows = Array.from({ length: config.rows }, (_, y) => y);
  const cols = Array.from({ length: config.cols }, (_, x) => x);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.grid}
        style={{ '--cols': config.cols } as CSSProperties}
        role="grid"
        aria-label="Backpack grid"
        onMouseLeave={() => setHover(null)}
      >
        {rows.map((y) =>
          cols.map((x) => {
            const key = cellKey(x, y);
            const usable = config.mask[y]?.[x] === true;
            const occupant = occupiedCells.get(key);
            const inPreview = preview?.keys.has(key) ?? false;

            const classNames = [styles.cell];
            if (!usable) classNames.push(styles.disabled);
            if (occupant) classNames.push(styles.occupied);
            if (inPreview) {
              classNames.push(preview?.valid ? styles.previewValid : styles.previewInvalid);
            }

            const label = occupant
              ? `Cell ${x + 1}, ${y + 1}: occupied`
              : usable
                ? `Cell ${x + 1}, ${y + 1}: empty`
                : `Cell ${x + 1}, ${y + 1}: unavailable`;

            return (
              <button
                key={key}
                type="button"
                className={classNames.join(' ')}
                style={occupant ? { backgroundColor: occupant.color } : undefined}
                disabled={!usable}
                aria-label={label}
                onMouseEnter={() => setHover({ x, y })}
                onFocus={() => setHover({ x, y })}
                onClick={() => handleActivate(x, y)}
                onContextMenu={(event) => {
                  if (occupant) {
                    event.preventDefault();
                    removePlaced(occupant.instanceId);
                  }
                }}
              />
            );
          }),
        )}
      </div>
      <p className={styles.hint}>
        {held
          ? 'Move over the grid and click to place'
          : 'Click an item to pick it up'}
      </p>
      <p className={styles.hint}>
        {held
          ? 'R to rotate \u00b7 Esc to cancel'
          : 'Right-click a placed item to remove it'}
      </p>

    </div>
  );
}
