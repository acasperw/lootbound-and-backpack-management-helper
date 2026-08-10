import { useMemo, useState, type CSSProperties } from 'react';
import { useBackpack } from '@/features/backpack/useBackpack';
import { cellKey, placedItemCells, rotateShape, shapeCells } from '@/lib/grid';
import { trackEvent } from '@/lib/analytics';
import styles from '@/features/backpack/BackpackGrid.module.css';

interface CellState {
  color: string;
  instanceId: string;
}

/** A placed item's label and the cell its name is anchored over. */
interface InstanceLabel {
  instanceId: string;
  name: string;
  color: string;
  /** Top-left corner of the item's bounding box, in cells. */
  minX: number;
  minY: number;
  /** Bounding-box size in cells; the label fills and centers within it. */
  width: number;
  height: number;
}

/** Pick a readable text color (black/white) for a given hex/CSS color. */
function readableTextColor(color: string): string {
  const hex = color.trim().replace('#', '');
  if (hex.length !== 3 && hex.length !== 6) return '#ffffff';
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Perceived luminance (ITU-R BT.601).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#ffffff';
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

  // Compute one label per placed item. The label fills the item's bounding box
  // and centers its text, so the name always stays within the item's footprint.
  const instanceLabels = useMemo(() => {
    const labels: InstanceLabel[] = [];
    for (const item of placed) {
      const definition = definitionsById.get(item.definitionId);
      if (!definition) continue;
      const cells = placedItemCells(item, definition);
      if (cells.length === 0) continue;
      const xs = cells.map((c) => c.x);
      const ys = cells.map((c) => c.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      labels.push({
        instanceId: item.instanceId,
        name: definition.name,
        color: definition.color,
        minX,
        minY,
        width: Math.max(...xs) - minX + 1,
        height: Math.max(...ys) - minY + 1,
      });
    }
    return labels;
  }, [placed, definitionsById]);

  // Build a box-shadow that fills the gap between same-item cells (so an item
  // reads as one solid block) and draws a crisp outline where it borders a
  // different item, empty space, or a disabled cell.
  const cellEdgeShadow = (x: number, y: number, occupant: CellState): string => {
    const parts: string[] = [];
    // Bottom/right edges take the dark shadow, top/left take the light rim, so
    // each item reads as a raised, chiseled block instead of a flat outline.
    const sides: Array<{ dx: number; dy: number; fill: string; edge: string; tone: 'dark' | 'light' }> = [
      { dx: 1, dy: 0, fill: `2px 0 0 0`, edge: `inset -2px 0 0 0`, tone: 'dark' },
      { dx: -1, dy: 0, fill: `-2px 0 0 0`, edge: `inset 2px 0 0 0`, tone: 'light' },
      { dx: 0, dy: 1, fill: `0 2px 0 0`, edge: `inset 0 -2px 0 0`, tone: 'dark' },
      { dx: 0, dy: -1, fill: `0 -2px 0 0`, edge: `inset 0 2px 0 0`, tone: 'light' },
    ];
    for (const side of sides) {
      const neighbor = occupiedCells.get(cellKey(x + side.dx, y + side.dy));
      if (neighbor?.instanceId === occupant.instanceId) {
        parts.push(`${side.fill} ${occupant.color}`);
      } else {
        const color = side.tone === 'dark' ? 'var(--color-item-outline)' : 'var(--color-item-rim)';
        parts.push(`${side.edge} ${color}`);
      }
    }
    return parts.join(', ');
  };

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
      if (canPlaceHeldAt(x, y)) trackEvent('place_item', { source: held.source });
      placeAt(x, y);
      return;
    }
    const occupant = occupiedCells.get(key);
    if (occupant) {
      trackEvent('pick_up_placed');
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
                style={
                  occupant
                    ? {
                        backgroundColor: occupant.color,
                        boxShadow: cellEdgeShadow(x, y, occupant),
                      }
                    : undefined
                }
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
        <div className={styles.labels} aria-hidden="true">
          {instanceLabels.map((item) => (
            <span
              key={item.instanceId}
              className={styles.label}
              style={
                {
                  '--label-x': item.minX,
                  '--label-y': item.minY,
                  '--label-width': item.width,
                  '--label-height': item.height,
                  color: readableTextColor(item.color),
                } as CSSProperties
              }
            >
              {item.name}
            </span>
          ))}
        </div>
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
