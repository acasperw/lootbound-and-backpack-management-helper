import { useMemo, useState } from 'react';
import { useBackpack } from '@/features/backpack/BackpackContext';
import { ShapeEditor } from '@/features/backpack/ShapeEditor';
import { ITEM_COLORS, PRESET_SHAPES, PRIORITY_LEVELS } from '@/features/backpack/itemCatalog';
import { isContiguous, shapeCells, trimShape } from '@/lib/grid';
import type {
  EdgeConstraint,
  ItemCategory,
  ItemDefinition,
  ItemRarity,
  ShapeMatrix,
} from '@/types/backpack';
import styles from '@/features/backpack/ItemBuilder.module.css';

const EDITOR_SIZE = 5;
const EDGES: readonly EdgeConstraint[] = ['top', 'bottom', 'left', 'right'];
const CATEGORIES: readonly ItemCategory[] = [
  'weapon',
  'armor',
  'consumable',
  'quest',
  'misc',
];
const RARITIES: readonly ItemRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];

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

/** Form for authoring a new stash item: shape, appearance, and constraints. */
export function ItemBuilder({ onDone }: { onDone?: () => void }) {
  const { addItem } = useBackpack();

  const [name, setName] = useState('');
  const [color, setColor] = useState(ITEM_COLORS[0]);
  const [category, setCategory] = useState<ItemCategory>('misc');
  const [rarity, setRarity] = useState<ItemRarity>('common');
  const [allowRotation, setAllowRotation] = useState(true);
  const [edge, setEdge] = useState<EdgeConstraint | null>(null);
  const [priority, setPriority] = useState(2);
  const [grid, setGrid] = useState<boolean[][]>(emptyGrid);

  const cellCount = useMemo(() => shapeCells(grid).length, [grid]);
  const contiguous = useMemo(() => isContiguous(trimShape(grid)), [grid]);
  const canAdd = cellCount > 0 && contiguous;

  const selectEdge = (next: EdgeConstraint) => {
    setEdge((current) => (current === next ? null : next));
  };

  const handleAdd = () => {
    if (!canAdd) return;
    const item: ItemDefinition = {
      id: createId(),
      name: name.trim() || 'Unnamed Item',
      category,
      rarity,
      color,
      priority,
      constraints: { allowRotation, edge },
      shape: trimShape(grid),
    };
    addItem(item);
    setName('');
    setEdge(null);
    setGrid(emptyGrid());
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
            value={category}
            onChange={(event) => setCategory(event.target.value as ItemCategory)}
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="item-rarity">
            Rarity
          </label>
          <select
            id="item-rarity"
            className={styles.select}
            value={rarity}
            onChange={(event) => setRarity(event.target.value as ItemRarity)}
          >
            {RARITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="item-priority">
            Priority
          </label>
          <select
            id="item-priority"
            className={styles.select}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
          >
            {PRIORITY_LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
