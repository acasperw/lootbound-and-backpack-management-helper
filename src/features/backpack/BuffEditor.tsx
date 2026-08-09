import type { CSSProperties } from 'react';
import type { BuffDirection, BuffPattern, BuffReach } from '@/types/backpack';
import styles from '@/features/backpack/BuffEditor.module.css';

/** Editor grid size; an odd number so the source sits dead centre. */
const SIZE = 5;
const CENTER = (SIZE - 1) / 2;

interface DirectionCells {
  /** Adjacent tile (distance 1) that lights for `'one'` and `'ray'`. */
  inner: readonly [number, number];
  /** Far tile (grid edge) that also lights for `'ray'`. */
  outer: readonly [number, number];
}

/** Where each direction's inner/outer indicator cells sit in the 5×5 grid. */
const DIRECTION_CELLS: Record<BuffDirection, DirectionCells> = {
  n: { inner: [2, 1], outer: [2, 0] },
  s: { inner: [2, 3], outer: [2, 4] },
  e: { inner: [3, 2], outer: [4, 2] },
  w: { inner: [1, 2], outer: [0, 2] },
  ne: { inner: [3, 1], outer: [4, 0] },
  nw: { inner: [1, 1], outer: [0, 0] },
  se: { inner: [3, 3], outer: [4, 4] },
  sw: { inner: [1, 3], outer: [0, 4] },
};

const DIRECTION_LABELS: Record<BuffDirection, string> = {
  n: 'up',
  s: 'down',
  e: 'right',
  w: 'left',
  ne: 'up-right',
  nw: 'up-left',
  se: 'down-right',
  sw: 'down-left',
};

type CellRole =
  | { kind: 'center' }
  | { kind: 'inner' | 'outer'; direction: BuffDirection }
  | { kind: 'inert' };

/** Lookup from `"x,y"` to the role that cell plays in the editor. */
const CELL_ROLES: ReadonlyMap<string, CellRole> = (() => {
  const roles = new Map<string, CellRole>();
  roles.set(`${CENTER},${CENTER}`, { kind: 'center' });
  for (const [direction, { inner, outer }] of Object.entries(DIRECTION_CELLS) as Array<
    [BuffDirection, DirectionCells]
  >) {
    roles.set(`${inner[0]},${inner[1]}`, { kind: 'inner', direction });
    roles.set(`${outer[0]},${outer[1]}`, { kind: 'outer', direction });
  }
  return roles;
})();

/** An empty pattern with every direction switched off. */
export const emptyBuffPattern = (): BuffPattern => ({
  n: 'none',
  ne: 'none',
  e: 'none',
  se: 'none',
  s: 'none',
  sw: 'none',
  w: 'none',
  nw: 'none',
});

/** Advance a direction through none → one → ray → none. */
const cycleReach = (reach: BuffReach): BuffReach =>
  reach === 'none' ? 'one' : reach === 'one' ? 'ray' : 'none';

interface BuffEditorProps {
  /** Current per-direction reach pattern (controlled). */
  value: BuffPattern;
  /** Omitted in read-only mode, where the grid is a static preview. */
  onChange?: (next: BuffPattern) => void;
  /** Render a non-interactive preview (e.g. inside a tooltip). */
  readOnly?: boolean;
}

/**
 * A 5×5 directional buff editor. The centre marks the source item; clicking a
 * direction cycles its reach: off, one adjacent tile (one dot), or a ray to the
 * grid edge (two dots). In {@link BuffEditorProps.readOnly} mode it renders a
 * static preview with no interaction.
 */
export function BuffEditor({ value, onChange, readOnly = false }: BuffEditorProps) {
  const toggleDirection = (direction: BuffDirection) => {
    onChange?.({ ...value, [direction]: cycleReach(value[direction]) });
  };

  const cells = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const role = CELL_ROLES.get(`${x},${y}`) ?? { kind: 'inert' as const };

      if (role.kind === 'center') {
        cells.push(
          <div key={`${x},${y}`} className={`${styles.cell} ${styles.center}`} aria-hidden="true" />,
        );
        continue;
      }

      if (role.kind === 'inert') {
        cells.push(<div key={`${x},${y}`} className={styles.cell} aria-hidden="true" />);
        continue;
      }

      const reach = value[role.direction];
      const lit = role.kind === 'inner' ? reach !== 'none' : reach === 'ray';
      const stateLabel = reach === 'none' ? 'off' : reach === 'one' ? 'one tile' : 'ray';
      const dirClass = `${styles.cell} ${styles.dir} ${lit ? styles.lit : ''}`;

      if (readOnly) {
        cells.push(
          <div
            key={`${x},${y}`}
            className={dirClass}
            aria-label={`Buff ${DIRECTION_LABELS[role.direction]}: ${stateLabel}`}
          />,
        );
        continue;
      }

      cells.push(
        <button
          key={`${x},${y}`}
          type="button"
          className={dirClass}
          aria-label={`Buff ${DIRECTION_LABELS[role.direction]}: ${stateLabel}`}
          aria-pressed={lit}
          onClick={() => toggleDirection(role.direction)}
        />,
      );
    }
  }

  return (
    <div
      className={`${styles.editor} ${readOnly ? styles.readOnly : ''}`}
      style={{ '--size': SIZE } as CSSProperties}
      role="group"
      aria-label="Buff direction editor"
    >
      {cells}
    </div>
  );
}
