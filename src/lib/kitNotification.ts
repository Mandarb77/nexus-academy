/*
 * Tiny cross-page signal for Supply purchases.
 *
 * A purchase happens on `/shop`, but the visible reminder lives in `MainNav` and clears
 * from `/inventory`. localStorage keeps the dot through route changes/page reloads, and
 * the custom event updates the current tab immediately because `storage` only fires in
 * other tabs.
 */

const KIT_NEW_ITEM_KEY = 'nexus-kit-has-new-item'
export const KIT_NEW_ITEM_EVENT = 'nexus-kit-new-item-change'

function emitKitNewItemChange() {
  window.dispatchEvent(new Event(KIT_NEW_ITEM_EVENT))
}

export function hasNewKitItem(): boolean {
  return window.localStorage.getItem(KIT_NEW_ITEM_KEY) === '1'
}

export function markKitHasNewItem() {
  window.localStorage.setItem(KIT_NEW_ITEM_KEY, '1')
  emitKitNewItemChange()
}

export function clearKitNewItem() {
  window.localStorage.removeItem(KIT_NEW_ITEM_KEY)
  emitKitNewItemChange()
}
