import { useEffect, useMemo } from 'react';
import { useBackpack } from '@/features/backpack/useBackpack';
import { BackpackGrid } from '@/features/backpack/BackpackGrid';
import { StashPanel } from '@/features/backpack/StashPanel';
import { StashTabs } from '@/features/backpack/StashTabs';
import { ItemEditorDrawer } from '@/features/backpack/ItemEditorDrawer';
import { scoreBuffs } from '@/lib/solver';
import { trackEvent } from '@/lib/analytics';
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
    refineProgress,
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

  const buffScore = useMemo(
    () => scoreBuffs(placed, definitionsById),
    [placed, definitionsById],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <StashTabs />
        <StashPanel />
      </div>

      <div className={styles.stage}>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              trackEvent('auto_fit', { item_count: definitions.length });
              autoFit();
            }}
            disabled={definitions.length === 0}
          >
            Auto-fit stash
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              trackEvent('clear_grid', { placed_count: placed.length });
              clearPlacements();
            }}
            disabled={placed.length === 0}
          >
            Clear grid
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              trackEvent('reset');
              reset();
            }}
            title="Reset the stash and clear the grid"
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
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                trackEvent('rotate_held');
                rotateHeld();
              }}
            >
              Rotate (R)
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                trackEvent('cancel_held');
                returnHeld();
              }}
            >
              Cancel (Esc)
            </button>
          </div>
        ) : null}

        <BackpackGrid />

        {refineProgress !== null ? (
          <div
            className={styles.refine}
            role="progressbar"
            aria-label="Optimizing buff placement"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(refineProgress * 100)}
          >
            <span className={styles.refineLabel}>
              Optimizing buffs… {Math.round(refineProgress * 100)}%
            </span>
            <span className={styles.refineTrack}>
              <span
                className={styles.refineFill}
                style={{ inlineSize: `${Math.round(refineProgress * 100)}%` }}
              />
            </span>
          </div>
        ) : null}

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
          <div className={styles.stat}>
            <span className={styles.statValue}>+{buffScore}</span>
            <span className={styles.statLabel}>Buff score</span>
          </div>
        </div>
      </div>

      <ItemEditorDrawer />
    </div>
  );
}
