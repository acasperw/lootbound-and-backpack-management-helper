import { BuffEditor } from '@/features/backpack/BuffEditor';
import { categoryPathLabel } from '@/features/backpack/categories';
import type { ItemBuff } from '@/types/backpack';
import styles from '@/features/backpack/BuffBadge.module.css';

/** Compact summary of a buff's amount and effect, e.g. `+20 Warmth`. */
const summary = (buff: ItemBuff): string =>
  `+${buff.amount}${buff.label ? ` ${buff.label}` : ''}`;

/**
 * A stash pill describing one buff. Hovering or focusing it reveals a card
 * with the affected category and a read-only preview of the buff's reach.
 */
export function BuffBadge({ buff }: { buff: ItemBuff }) {
  const affects = categoryPathLabel(buff.target);
  return (
    <span className={styles.wrap}>
      <span className={styles.badge} tabIndex={0} aria-describedby={`buff-${buff.id}`}>
        <span aria-hidden="true">✦</span> {summary(buff)}
      </span>
      <span role="tooltip" id={`buff-${buff.id}`} className={styles.card}>
        <span className={styles.affects}>
          Affects: <strong>{affects}</strong>
        </span>
        <BuffEditor value={buff.pattern} readOnly />
        <span className={styles.effect}>{summary(buff)}</span>
      </span>
    </span>
  );
}
