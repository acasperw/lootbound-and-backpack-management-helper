/**
 * Pure helpers for the dotted category taxonomy.
 *
 * Ids encode their group via dot notation (`'weapon.hammer'` belongs to the
 * `'weapon'` group), so parent lookup and buff-target matching are string
 * operations that need no tree data. This keeps the solver free of any UI
 * dependency on the taxonomy definition.
 *
 * @author Backpack Helper
 */

/**
 * Return the group id of a category id, or `null` for a top-level group.
 *
 * @example
 * parentCategoryId('weapon.hammer'); // 'weapon'
 * parentCategoryId('weapon');        // null
 */
export function parentCategoryId(categoryId: string): string | null {
  const dot = categoryId.indexOf('.');
  return dot === -1 ? null : categoryId.slice(0, dot);
}

/**
 * Whether a buff aimed at `target` applies to an item of `categoryId`.
 *
 * A target matches when it is the item's exact category, or the group the
 * item's leaf belongs to.
 *
 * @param target - The buff's target category (group or leaf id).
 * @param categoryId - The candidate item's category id.
 * @example
 * buffTargetMatches('weapon', 'weapon.hammer');        // true
 * buffTargetMatches('weapon.hammer', 'weapon.hammer'); // true
 * buffTargetMatches('weapon.sword', 'weapon.hammer');  // false
 */
export function buffTargetMatches(target: string, categoryId: string): boolean {
  return target === categoryId || parentCategoryId(categoryId) === target;
}
