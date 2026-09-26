import type { Menu, Store } from '@bbt/shared';

/** Where the routes read the store and menu from. Implementations: seed (in memory) and Postgres. */
export interface Catalogue {
  getStore(): Promise<Store>;
  getMenu(): Promise<Menu>;
}
