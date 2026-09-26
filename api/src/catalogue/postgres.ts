import { MenuSchema, StoreSchema } from '@bbt/shared';
import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { menuCategories, menuItems, optionLevels, stores, toppings } from '../db/schema';
import type { Catalogue } from './types';

/** Reads the catalogue from Postgres and parses it into the shared contract. */
export function createPostgresCatalogue(db: Db): Catalogue {
  return {
    async getStore() {
      const [row] = await db.select().from(stores).orderBy(asc(stores.id)).limit(1);
      if (!row) {
        throw new Error('The database has no store. Seed it with the db-seed skill.');
      }
      return StoreSchema.parse({
        id: row.id,
        name: row.name,
        shortName: row.shortName,
        addressLines: row.addressLines,
        suburb: row.suburb,
        state: row.state,
        postcode: row.postcode,
        ...(row.phone === null ? {} : { phone: row.phone }),
        timezone: row.timezone,
        hours: row.hours,
      });
    },

    async getMenu() {
      const [categories, items, sugarLevels, iceLevels, toppingRows] = await Promise.all([
        db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder)),
        db.select().from(menuItems).orderBy(asc(menuItems.sortOrder)),
        db
          .select()
          .from(optionLevels)
          .where(eq(optionLevels.group, 'sugar'))
          .orderBy(asc(optionLevels.sortOrder)),
        db
          .select()
          .from(optionLevels)
          .where(eq(optionLevels.group, 'ice'))
          .orderBy(asc(optionLevels.sortOrder)),
        db.select().from(toppings).orderBy(asc(toppings.sortOrder)),
      ]);
      return MenuSchema.parse({
        categories: categories.map(({ id, name, sortOrder }) => ({ id, name, sortOrder })),
        items: items.map((item) => ({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          ...(item.description === null ? {} : { description: item.description }),
          priceCents: item.priceCents,
          currency: item.currency,
          tags: item.tags,
          colour: item.colour,
          pearls: item.pearls,
        })),
        customisations: {
          sugarLevels: sugarLevels.map(({ id, name, isDefault }) => ({ id, name, isDefault })),
          iceLevels: iceLevels.map(({ id, name, isDefault }) => ({ id, name, isDefault })),
          toppings: toppingRows.map(({ id, name, priceCents }) => ({ id, name, priceCents })),
        },
      });
    },
  };
}
