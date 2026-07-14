/**
 * Data access for the app. Thin re-export of the real catalog, which grades
 * the committed OKX.AI marketplace snapshot. Swap the snapshot source (or wire
 * a live refresh) in one place — every page follows.
 */
export {
  getRatings,
  getStats,
  getAgent,
  getByCategory,
  getCategories,
  getTop,
  getCertified,
  searchRatings,
} from "./catalog";
