import { BackpackProvider } from '@/features/backpack/BackpackContext';
import { BackpackHelper } from '@/features/backpack/BackpackHelper';
import styles from '@/App.module.css';

/** Application root: composes the backpack helper within its state provider. */
export function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Backpack Management Helper</h1>
        <p className={styles.subtitle}>
          Build your stash, set each item&rsquo;s constraints, and auto-fit it into the backpack.
        </p>
      </header>
      <main className={styles.main}>
        <BackpackProvider>
          <BackpackHelper />
        </BackpackProvider>
      </main>
      <footer className={styles.footer}>
        <a
          className={styles.sourceLink}
          href="https://github.com/acasperw/lootbound-and-backpack-management-helper"
          target="_blank"
          rel="noreferrer"
        >
          View source on GitHub
        </a>
      </footer>
    </div>
  );
}
