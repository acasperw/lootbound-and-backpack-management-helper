import { useState } from 'react';
import { useBackpack } from '@/features/backpack/useBackpack';
import { ShapeEditor } from '@/features/backpack/ShapeEditor';
import { isContiguous, MAX_GRID_SIZE, resizeMask } from '@/lib/grid';
import { trackEvent } from '@/lib/analytics';
import type { BackpackConfig } from '@/types/backpack';
import styles from '@/features/backpack/GridEditor.module.css';

/** Color painted onto usable cells inside the mask editor. */
const USABLE_COLOR = '#5fae62';

const clampSize = (value: number): number =>
  Math.min(MAX_GRID_SIZE, Math.max(1, Math.round(value)));

interface GridEditorProps {
  onClose: () => void;
}

/**
 * Compact editor for the backpack layout: choose the width and height (up to
 * {@link MAX_GRID_SIZE} each) and paint which cells are usable. The shape must
 * stay a single contiguous region before it can be saved.
 */
export function GridEditor({ onClose }: GridEditorProps) {
  const { config, updateBackpackConfig } = useBackpack();
  const [cols, setCols] = useState(config.cols);
  const [rows, setRows] = useState(config.rows);
  const [mask, setMask] = useState<boolean[][]>(() =>
    config.mask.map((row) => [...row]),
  );

  const usableCount = mask.reduce(
    (sum, row) => sum + row.reduce((count, cell) => count + (cell ? 1 : 0), 0),
    0,
  );
  const contiguous = isContiguous(mask);
  const valid = usableCount > 0 && contiguous;

  const resize = (nextCols: number, nextRows: number) => {
    const c = clampSize(nextCols);
    const r = clampSize(nextRows);
    setCols(c);
    setRows(r);
    setMask((current) => resizeMask(current, c, r));
  };

  const handleSave = () => {
    if (!valid) return;
    const next: BackpackConfig = { cols, rows, mask };
    trackEvent('grid_resize', { cols, rows, usable: usableCount });
    updateBackpackConfig(next);
    onClose();
  };

  return (
    <div className={styles.panel} role="group" aria-label="Edit backpack grid">
      <div className={styles.controls}>
        <div className={styles.stepper}>
          <span className={styles.stepperLabel}>Width</span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => resize(cols - 1, rows)}
            disabled={cols <= 1}
            aria-label="Decrease width"
          >
            &minus;
          </button>
          <span className={styles.stepValue}>{cols}</span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => resize(cols + 1, rows)}
            disabled={cols >= MAX_GRID_SIZE}
            aria-label="Increase width"
          >
            +
          </button>
        </div>

        <div className={styles.stepper}>
          <span className={styles.stepperLabel}>Height</span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => resize(cols, rows - 1)}
            disabled={rows <= 1}
            aria-label="Decrease height"
          >
            &minus;
          </button>
          <span className={styles.stepValue}>{rows}</span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => resize(cols, rows + 1)}
            disabled={rows >= MAX_GRID_SIZE}
            aria-label="Increase height"
          >
            +
          </button>
        </div>
      </div>

      <p className={styles.hint}>
        Click or drag to toggle which cells are usable.
      </p>

      <ShapeEditor value={mask} color={USABLE_COLOR} onChange={setMask} />

      {!valid ? (
        <p className={styles.error} role="status">
          {usableCount === 0
            ? 'Select at least one usable cell.'
            : 'The usable cells must form one connected region.'}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={handleSave}
          disabled={!valid}
        >
          Save grid
        </button>
        <button type="button" className={styles.button} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
