import { type CSSProperties } from 'react';
import { useBackpack } from '@/features/backpack/useBackpack';
import { ShapePreview } from '@/features/backpack/ShapePreview';
import { BuffBadge } from '@/features/backpack/BuffBadge';
import { categoryPathLabel } from '@/features/backpack/categories';
import { PRIORITY_LEVELS } from '@/features/backpack/itemCatalog';
import { trackEvent } from '@/lib/analytics';
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
 * The active stash: the list of items to pack, with per-item controls to edit,
 * re-prioritise, send to another stash, or remove. Items are ordered by
 * priority (highest first). Clicking an item picks it up for manual placement;
 * items the last auto-fit could not place are flagged. Adding and editing items
 * happen in a drawer opened from here.
 */
export function StashPanel() {
  const {
    definitions,
    held,
    unplaced,
    stashes,
    activeStashId,
    pickUpFromPalette,
    removeItem,
    setItemPriority,
    moveItemToStash,
    openEditor,
  } = useBackpack();
  const unplacedSet = new Set(unplaced);
  const ordered = [...definitions].sort((a, b) => b.priority - a.priority);
  const otherStashes = stashes.filter((stash) => stash.id !== activeStashId);
  const activeStash = stashes.find((stash) => stash.id === activeStashId);

  return (
    <section className={styles.panel} aria-label="Stash">
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {activeStash?.name ?? 'Stash'} ({definitions.length})
        </h2>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            trackEvent('open_item_editor', { mode: 'add' });
            openEditor();
          }}
        >
          + Add item
        </button>
      </div>

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
                  onClick={() => {
                    trackEvent('pick_up_item', { category_id: item.categoryId });
                    pickUpFromPalette(item.id);
                  }}
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

                <div className={styles.actions}>
                  <select
                    className={styles.priority}
                    value={item.priority}
                    aria-label={`Priority for ${item.name}`}
                    onChange={(event) => {
                      trackEvent('set_item_priority', {
                        priority: Number(event.target.value),
                      });
                      setItemPriority(item.id, Number(event.target.value));
                    }}
                  >
                    {PRIORITY_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>

                  {otherStashes.length > 0 ? (
                    <select
                      className={styles.send}
                      value=""
                      aria-label={`Send ${item.name} to another stash`}
                      onChange={(event) => {
                        if (event.target.value) {
                          trackEvent('move_item_to_stash', {
                            target_stash_id: event.target.value,
                          });
                          moveItemToStash(item.id, event.target.value);
                        }
                      }}
                    >
                      <option value="">Send to&hellip;</option>
                      {otherStashes.map((stash) => (
                        <option key={stash.id} value={stash.id}>
                          {stash.name}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => {
                      trackEvent('open_item_editor', { mode: 'edit' });
                      openEditor(item.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove ${item.name}`}
                    onClick={() => {
                      trackEvent('remove_item', { category_id: item.categoryId });
                      removeItem(item.id);
                    }}
                  >
                    &times;
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
