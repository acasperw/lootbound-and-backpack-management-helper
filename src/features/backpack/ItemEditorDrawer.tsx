import { useEffect } from 'react';
import { useBackpack } from '@/features/backpack/useBackpack';
import { ItemBuilder } from '@/features/backpack/ItemBuilder';
import styles from '@/features/backpack/ItemEditorDrawer.module.css';

/**
 * Right-side drawer hosting the add/edit item form. It mounts only while open
 * and closes on the overlay click or the Escape key. The same {@link ItemBuilder}
 * powers both adding a new item and editing an existing one.
 */
export function ItemEditorDrawer() {
  const { editorOpen, editorItem, closeEditor } = useBackpack();

  useEffect(() => {
    if (!editorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorOpen, closeEditor]);

  if (!editorOpen) return null;

  const title = editorItem ? 'Edit item' : 'Add item';

  return (
    <div className={styles.overlay} onClick={closeEditor}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={closeEditor}
          >
            &times;
          </button>
        </header>
        <div className={styles.body}>
          <ItemBuilder item={editorItem ?? undefined} onDone={closeEditor} />
        </div>
      </aside>
    </div>
  );
}
