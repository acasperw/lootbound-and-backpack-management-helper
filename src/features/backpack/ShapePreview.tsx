import type { CSSProperties } from 'react';
import type { ShapeMatrix } from '@/types/backpack';
import styles from '@/features/backpack/ShapePreview.module.css';

interface ShapePreviewProps {
  shape: ShapeMatrix;
  color: string;
  /** Size of each mini cell, in rem. */
  cellRem?: number;
}

/** Renders a small read-only rendering of an item's shape. */
export function ShapePreview({ shape, color, cellRem = 0.75 }: ShapePreviewProps) {
  const cols = shape[0]?.length ?? 0;

  return (
    <div
      className={styles.grid}
      style={
        {
          '--cols': cols,
          '--mini-cell': `${cellRem}rem`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {shape.flatMap((row, y) =>
        row.map((filled, x) => (
          <span
            key={`${x},${y}`}
            className={filled ? styles.filled : styles.empty}
            style={filled ? { backgroundColor: color } : undefined}
          />
        )),
      )}
    </div>
  );
}
