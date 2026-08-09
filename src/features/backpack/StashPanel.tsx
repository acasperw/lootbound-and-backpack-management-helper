import { useState, type CSSProperties } from 'react';
import { useBackpack } from '@/features/backpack/BackpackContext';
import { ItemBuilder } from '@/features/backpack/ItemBuilder';
import { ShapePreview } from '@/features/backpack/ShapePreview';
import { BuffBadge } from '@/features/backpack/BuffBadge';
import { categoryPathLabel } from '@/features/backpack/categories';
import { PRIORITY_LEVELS } from '@/features/backpack/itemCatalog';
import type { ItemDefinition } from '@/types/backpack';
import styles from '@/features/backpack/StashPanel.module.css';

/** Accent color for the stash item's leading border, keyed by priority. */
const PRIORITY_VAR: Record<number, string> = {
  3: 'var(--priority-high)',
  2: 'var(--priority-medium)',
  1: 'var(--priority-low)',
};

/** Renders the constraint pills for a single stash item. */
function ItemBadges({ item }: { item: ItemDefinition }) {
  const { constraints } = item;
  return (
    <div className={styles.badges}>
      <span className={`${styles.badge} ${styles.badgeCategory}`}>
        {categoryPathLabel(item.categoryId)}
      </span>
      {!constraints.allowRotation ? (
        <span className={styles.badge}>No rotate</span>
      ) : null}
      {constraints.edge ? (
        <span className={styles.badge}>{constraints.edge}</span>
      ) : null}
      {item.buffs?.map((buff) => (
        <BuffBadge key={buff.id} buff={buff} />
      ))}
    </div>
  );
}

/**
 * The user's stash: the list of items to pack, plus the builder for adding
 * new ones. Items are ordered by priority (highest first). Clicking an item
 * picks it up for manual placement; items the last auto-fit could not place
 * are flagged.
 */
export function StashPanel() {
  const { definitions, held, unplaced, pickUpFromPalette, removeItem, setItemPriority } =
    useBackpack();
  const [showBuilder, setShowBuilder] = useState(false);
  const unplacedSet = new Set(unplaced);
  const ordered = [...definitions].sort((a, b) => b.priority - a.priority);

  return (
    <section className={styles.panel} aria-label="Stash">
      <div className={styles.header}>
        <h2 className={styles.heading}>Stash ({definitions.length})</h2>
        <button
          type="button"
          className={styles.addButton}
          aria-expanded={showBuilder}
          onClick={() => setShowBuilder((open) => !open)}
        >
          {showBuilder ? 'Close' : '+ Add item'}
        </button>
      </div>

      {showBuilder ? <ItemBuilder onDone={() => setShowBuilder(false)} /> : null}

      {definitions.length === 0 ? (
        <p className={styles.empty}>Your stash is empty. Add an item to get started.</p>
      ) : (
        <ul className={styles.list}>
          {ordered.map((item) => {
            const isActive =
              held?.source === 'palette' && held.definitionId === item.id;
            const isUnplaced = unplacedSet.has(item.id);
            const classNames = [styles.item];
            if (isActive) classNames.push(styles.itemActive);
            if (isUnplaced) classNames.push(styles.itemUnplaced);

            return (
              <li
                key={item.id}
                className={classNames.join(' ')}
                style={{ '--priority-color': PRIORITY_VAR[item.priority] } as CSSProperties}
              >
                <button
                  type="button"
                  className={styles.select}
                  aria-pressed={isActive}
                  onClick={() => pickUpFromPalette(item.id)}
                >
                  <span className={styles.preview}>
                    <ShapePreview shape={item.shape} color={item.color} />
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.name}>{item.name}</span>
                    <ItemBadges item={item} />
                    {isUnplaced ? (
                      <span className={`${styles.badge} ${styles.badgeWarn}`}>
                        Doesn&rsquo;t fit
                      </span>
                    ) : null}
                  </span>
                </button>
                <select
                  className={styles.priority}
                  value={item.priority}
                  aria-label={`Priority for ${item.name}`}
                  onChange={(event) =>
                    setItemPriority(item.id, Number(event.target.value))
                  }
                >
                  {PRIORITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.id)}
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
