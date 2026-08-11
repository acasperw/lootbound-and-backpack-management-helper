import { useCallback, useEffect, useRef } from 'react';
import { useBackpack } from '@/features/backpack/useBackpack';
import { ItemBuilder } from '@/features/backpack/ItemBuilder';
import styles from '@/features/backpack/ItemEditorDrawer.module.css';

/**
 * Right-side drawer hosting the add/edit item form. It mounts only while open
 * and closes on the overlay click or the Escape key. The same {@link ItemBuilder}
 * powers both adding a new item and editing an existing one.
 *
 * Closing is guarded: a backdrop dismiss only counts when the press starts and
 * ends on the overlay (so a drag out of the form never closes it), and any
 * close with unsaved edits asks for confirmation first.
 */
export function ItemEditorDrawer() {
  const { editorOpen, editorItem, closeEditor } = useBackpack();

  const dirtyRef = useRef(false);
  // True only when a press began on the overlay itself, not inside the drawer.
  const pressOnOverlay = useRef(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm('Discard your unsaved changes?')) return;
    closeEditor();
  }, [closeEditor]);

  useEffect(() => {
    if (!editorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorOpen, requestClose]);

  if (!editorOpen) return null;

  const title = editorItem ? 'Edit item' : 'Add item';

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        pressOnOverlay.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressOnOverlay.current) {
          requestClose();
        }
      }}
    >
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={requestClose}
          >
            &times;
          </button>
        </header>
        <div className={styles.body}>
          <ItemBuilder
            item={editorItem ?? undefined}
            onDone={closeEditor}
            onDirtyChange={handleDirtyChange}
          />
        </div>
      </aside>
    </div>
  );
}
