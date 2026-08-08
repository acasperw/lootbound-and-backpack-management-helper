import type { CSSProperties } from 'react';
import styles from '@/features/backpack/ShapeEditor.module.css';

interface ShapeEditorProps {
  /** Fixed-size boolean grid being drawn (row-major). */
  value: boolean[][];
  color: string;
  onChange: (next: boolean[][]) => void;
}

/** Interactive canvas for drawing an item's shape by toggling cells. */
export function ShapeEditor({ value, color, onChange }: ShapeEditorProps) {
  const cols = value[0]?.length ?? 0;

  const toggle = (x: number, y: number) => {
    const next = value.map((row) => [...row]);
    next[y][x] = !next[y][x];
    onChange(next);
  };

  return (
    <div
      className={styles.editor}
      style={{ '--cols': cols } as CSSProperties}
      role="group"
      aria-label="Shape editor"
    >
      {value.flatMap((row, y) =>
        row.map((filled, x) => (
          <button
            key={`${x},${y}`}
            type="button"
            className={`${styles.cell} ${filled ? styles.filled : ''}`}
            style={filled ? { backgroundColor: color } : undefined}
            aria-label={`Cell ${x + 1}, ${y + 1}: ${filled ? 'filled' : 'empty'}`}
            aria-pressed={filled}
            onClick={() => toggle(x, y)}
          />
        )),
      )}
    </div>
  );
}
