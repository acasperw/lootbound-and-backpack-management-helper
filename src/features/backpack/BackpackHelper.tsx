import { useEffect, useMemo } from 'react';
import { useBackpack } from '@/features/backpack/BackpackContext';
import { BackpackGrid } from '@/features/backpack/BackpackGrid';
import { StashPanel } from '@/features/backpack/StashPanel';
import styles from '@/features/backpack/BackpackHelper.module.css';

/**
 * Top-level backpack workspace: the stash, the auto-fit controls, the
 * interactive grid, and summary stats. Also wires global keyboard shortcuts
 * (R to rotate, Esc to cancel the held item) for manual placement.
 */
export function BackpackHelper() {
  const {
    config,
    definitions,
    placed,
    definitionsById,
    held,
    occupancy,
    unplaced,
    autoFit,
    clearPlacements,
    rotateHeld,
    returnHeld,
    reset,
  } = useBackpack();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!held) return;
      if (event.key === 'r' || event.key === 'R') {
        rotateHeld();
      } else if (event.key === 'Escape') {
        returnHeld();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [held, rotateHeld, returnHeld]);

  const heldName = held ? definitionsById.get(held.definitionId)?.name : null;

  const { usableCells, filledCells } = useMemo(() => {
    let usable = 0;
    for (let y = 0; y < config.rows; y += 1) {
      for (let x = 0; x < config.cols; x += 1) {
        if (config.mask[y]?.[x]) usable += 1;
      }
    }
    return { usableCells: usable, filledCells: occupancy.size };
  }, [config, occupancy]);

  const usedPercent = usableCells === 0 ? 0 : Math.round((filledCells / usableCells) * 100);

  return (
    <div className={styles.layout}>
      <StashPanel />

      <div className={styles.stage}>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.primary}
            onClick={autoFit}
            disabled={definitions.length === 0}
          >
            Auto-fit stash
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={clearPlacements}
            disabled={placed.length === 0}
          >
            Clear grid
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={reset}
            title="Restore the starter stash and clear the grid"
          >
            Reset
          </button>
        </div>

        {unplaced.length > 0 ? (
          <p className={styles.warning} role="status">
            {unplaced.length} item{unplaced.length === 1 ? '' : 's'} couldn&rsquo;t fit with
            the current stash and constraints.
          </p>
        ) : null}

        {held ? (
          <div className={styles.manual}>
            <span className={styles.held}>
              Holding: <strong>{heldName}</strong> ({held.rotation}&deg;)
            </span>
            <button type="button" className={styles.button} onClick={rotateHeld}>
              Rotate (R)
            </button>
            <button type="button" className={styles.button} onClick={returnHeld}>
              Cancel (Esc)
            </button>
          </div>
        ) : null}

        <BackpackGrid />

        <div className={styles.stats} role="group" aria-label="Backpack usage">
          <div className={styles.stat}>
            <span className={styles.statValue}>{placed.length}</span>
            <span className={styles.statLabel}>Placed</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {filledCells}/{usableCells}
            </span>
            <span className={styles.statLabel}>Cells used</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{usedPercent}%</span>
            <span className={styles.statLabel}>Full</span>
          </div>
        </div>
      </div>
    </div>
  );
}
