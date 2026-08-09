import { useBackpack } from '@/features/backpack/useBackpack';
import styles from '@/features/backpack/StashTabs.module.css';

/**
 * Loadout-style selector for switching between the three stashes. Each tab
 * shows the stash name and how many items it holds; the active stash drives
 * both the stash panel and the backpack grid.
 */
export function StashTabs() {
  const { stashes, activeStashId, setActiveStash } = useBackpack();

  return (
    <div className={styles.tabs} role="tablist" aria-label="Stashes">
      {stashes.map((stash) => {
        const isActive = stash.id === activeStashId;
        return (
          <button
            key={stash.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            onClick={() => setActiveStash(stash.id)}
          >
            <span className={styles.name}>{stash.name}</span>
            <span className={styles.count}>{stash.itemCount}</span>
          </button>
        );
      })}
    </div>
  );
}
