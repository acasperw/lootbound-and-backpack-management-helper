import { useEffect, useRef, type CSSProperties } from 'react';
import styles from '@/features/backpack/ShapeEditor.module.css';

interface ShapeEditorProps {
  /** Fixed-size boolean grid being drawn (row-major). */
  value: boolean[][];
  color: string;
  onChange: (next: boolean[][]) => void;
}

/** Interactive canvas for drawing an item's shape by painting cells. */
export function ShapeEditor({ value, color, onChange }: ShapeEditorProps) {
  const cols = value[0]?.length ?? 0;
  // Paint mode captured on pointer-down (true = fill, false = erase); null
  // when no stroke is in progress. A ref so drag handlers read it live.
  const paintMode = useRef<boolean | null>(null);

  // End the stroke even if the pointer is released outside the grid.
  useEffect(() => {
    const end = () => {
      paintMode.current = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const paint = (x: number, y: number, fill: boolean) => {
    if (value[y][x] === fill) return;
    const next = value.map((row) => [...row]);
    next[y][x] = fill;
    onChange(next);
  };

  const startStroke = (x: number, y: number) => {
    const fill = !value[y][x];
    paintMode.current = fill;
    paint(x, y, fill);
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
            onPointerDown={(event) => {
              event.preventDefault();
              startStroke(x, y);
            }}
            onPointerEnter={() => {
              if (paintMode.current !== null) paint(x, y, paintMode.current);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                paint(x, y, !filled);
              }
            }}
          />
        )),
      )}
    </div>
  );
}

