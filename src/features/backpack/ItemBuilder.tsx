import { useMemo, useState, type ReactNode } from 'react';
import { useBackpack } from '@/features/backpack/BackpackContext';
import { ShapeEditor } from '@/features/backpack/ShapeEditor';
import { BuffEditor, emptyBuffPattern } from '@/features/backpack/BuffEditor';
import { CATEGORY_TREE } from '@/features/backpack/categories';
import { ITEM_COLORS, PRESET_SHAPES } from '@/features/backpack/itemCatalog';
import { isContiguous, shapeCells, trimShape } from '@/lib/grid';
import type {
  EdgeConstraint,
  ItemBuff,
  ItemDefinition,
  ShapeMatrix,
} from '@/types/backpack';
import styles from '@/features/backpack/ItemBuilder.module.css';

const EDITOR_SIZE = 6;
const EDGES: readonly EdgeConstraint[] = ['top', 'bottom', 'left', 'right'];

/** Grouped `<option>`s for a category `<select>`, reused for items and buffs. */
function CategoryOptions(): ReactNode {
  return CATEGORY_TREE.map((group) =>
    group.children ? (
      <optgroup key={group.id} label={group.label}>
        <option value={group.id}>{`${group.label} (all)`}</option>
        {group.children.map((leaf) => (
          <option key={leaf.id} value={leaf.id}>
            {leaf.label}
          </option>
        ))}
      </optgroup>
    ) : (
      <option key={group.id} value={group.id}>
        {group.label}
      </option>
    ),
  );
}

const emptyGrid = (): boolean[][] =>
  Array.from({ length: EDITOR_SIZE }, () =>
    Array.from({ length: EDITOR_SIZE }, () => false),
  );

/** Stamp a preset shape into the top-left of an empty editor grid. */
const gridFromPreset = (shape: ShapeMatrix): boolean[][] => {
  const grid = emptyGrid();
  for (let y = 0; y < shape.length && y < EDITOR_SIZE; y += 1) {
    for (let x = 0; x < shape[y].length && x < EDITOR_SIZE; x += 1) {
      grid[y][x] = shape[y][x];
    }
  }
  return grid;
};

const createId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`;

/** A fresh buff aimed at all weapons, radiating one tile in every direction. */
const createBuff = (): ItemBuff => ({
  id: createId(),
  target: 'weapon',
  pattern: emptyBuffPattern(),
  amount: 10,
  label: '',
});

/** Form for authoring a new stash item: shape, appearance, and constraints. */
export function ItemBuilder({ onDone }: { onDone?: () => void }) {
  const { addItem } = useBackpack();

  const [name, setName] = useState('');
  const [color, setColor] = useState(ITEM_COLORS[0]);
  const [categoryId, setCategoryId] = useState<string>('misc');
  const [allowRotation, setAllowRotation] = useState(true);
  const [edge, setEdge] = useState<EdgeConstraint | null>(null);
  const [priority] = useState(2);
  const [grid, setGrid] = useState<boolean[][]>(emptyGrid);
  const [buffs, setBuffs] = useState<ItemBuff[]>([]);

  const cellCount = useMemo(() => shapeCells(grid).length, [grid]);
  const contiguous = useMemo(() => isContiguous(trimShape(grid)), [grid]);
  const canAdd = cellCount > 0 && contiguous;

  const selectEdge = (next: EdgeConstraint) => {
    setEdge((current) => (current === next ? null : next));
  };

  const addBuff = () => setBuffs((current) => [...current, createBuff()]);

  const updateBuff = (id: string, patch: Partial<ItemBuff>) => {
    setBuffs((current) =>
      current.map((buff) => (buff.id === id ? { ...buff, ...patch } : buff)),
    );
  };

  const removeBuff = (id: string) => {
    setBuffs((current) => current.filter((buff) => buff.id !== id));
  };

  const handleAdd = () => {
    if (!canAdd) return;
    // Drop buffs that cover no direction so they never reach the solver.
    const activeBuffs = buffs
      .filter((buff) => Object.values(buff.pattern).some((reach) => reach !== 'none'))
      .map((buff) => ({ ...buff, label: buff.label?.trim() || undefined }));
    const item: ItemDefinition = {
      id: createId(),
      name: name.trim() || 'Unnamed Item',
      categoryId,
      color,
      priority,
      constraints: { allowRotation, edge },
      shape: trimShape(grid),
      ...(activeBuffs.length > 0 ? { buffs: activeBuffs } : {}),
    };
    addItem(item);
    setName('');
    setEdge(null);
    setGrid(emptyGrid());
    setBuffs([]);
    onDone?.();
  };

  return (
    <div className={styles.builder}>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="item-name">
          Name
        </label>
        <input
          id="item-name"
          className={styles.input}
          type="text"
          value={name}
          placeholder="e.g. Enchanted Blade"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className={styles.canvas}>
        <div className={styles.row}>
          <span className={styles.label}>Shape</span>
          <ShapeEditor value={grid} color={color} onChange={setGrid} />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Presets</span>
          <div className={styles.presets}>
            {PRESET_SHAPES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.chip}
                onClick={() => setGrid(gridFromPreset(preset.shape))}
              >
                {preset.name}
              </button>
            ))}
            <button
              type="button"
              className={styles.chip}
              onClick={() => setGrid(emptyGrid())}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Color</span>
        <div className={styles.swatches}>
          {ITEM_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={`${styles.swatch} ${swatch === color ? styles.swatchActive : ''}`}
              style={{ backgroundColor: swatch }}
              aria-label={`Color ${swatch}`}
              aria-pressed={swatch === color}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
      </div>

      <div className={styles.canvas}>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="item-category">
            Category
          </label>
          <select
            id="item-category"
            className={styles.select}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <CategoryOptions />
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={allowRotation}
            onChange={(event) => setAllowRotation(event.target.checked)}
          />
          Can be rotated
        </label>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Must touch edge</span>
        <div className={styles.edges}>
          {EDGES.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.chip} ${edge === option ? styles.chipActive : ''}`}
              aria-pressed={edge === option}
              onClick={() => selectEdge(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.buffsHeader}>
          <span className={styles.label}>Buffs</span>
          <button type="button" className={styles.chip} onClick={addBuff}>
            + Add buff
          </button>
        </div>
        {buffs.length === 0 ? (
          <p className={styles.hint}>
            No buffs. Add one to boost nearby items of a chosen category.
          </p>
        ) : (
          <>
            <p className={styles.hint}>
              Strength is how hard auto-fit tries to place a matching item inside the
              pattern.
            </p>
            <ul className={styles.buffList}>
            {buffs.map((buff) => (
              <li key={buff.id} className={styles.buff}>
                <BuffEditor
                  value={buff.pattern}
                  onChange={(pattern) => updateBuff(buff.id, { pattern })}
                />
                <div className={styles.buffFields}>
                  <label className={styles.buffField}>
                    <span className={styles.label}>Affects</span>
                    <select
                      className={styles.select}
                      value={buff.target}
                      onChange={(event) =>
                        updateBuff(buff.id, { target: event.target.value })
                      }
                    >
                      <CategoryOptions />
                    </select>
                  </label>
                  <label className={styles.buffField}>
                    <span className={styles.label}>Strength</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      title="Solver weight: how strongly to pull a matching item into this pattern."
                      value={buff.amount}
                      onChange={(event) =>
                        updateBuff(buff.id, {
                          amount: Math.max(0, Math.round(Number(event.target.value) || 0)),
                        })
                      }
                    />
                  </label>
                  <label className={styles.buffField}>
                    <span className={styles.label}>Effect</span>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="e.g. Slash Damage"
                      value={buff.label ?? ''}
                      onChange={(event) =>
                        updateBuff(buff.id, { label: event.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => removeBuff(buff.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      {cellCount > 0 && !contiguous ? (
        <p className={styles.error} role="alert">
          Shape cells must be connected before adding.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={!canAdd}
          onClick={handleAdd}
        >
          Add to stash
        </button>
        {onDone ? (
          <button type="button" className={styles.secondary} onClick={onDone}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
