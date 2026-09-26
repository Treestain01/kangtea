import type { Seed } from '../catalogue/seed';
import type { Db } from './client';
import { menuCategories, menuItems, optionLevels, stores, toppings } from './schema';

/**
 * Replaces the whole catalogue with the seed, in one transaction.
 * Running it twice leaves the database identical, which is what "reset to the base template" means.
 */
export async function seedDatabase(db: Db, seed: Seed): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(menuItems);
    await tx.delete(menuCategories);
    await tx.delete(optionLevels);
    await tx.delete(toppings);
    await tx.delete(stores);

    const { store, menu } = seed;
    await tx.insert(stores).values({
      id: store.id,
      name: store.name,
      shortName: store.shortName,
      addressLines: store.addressLines,
      suburb: store.suburb,
      state: store.state,
      postcode: store.postcode,
      phone: store.phone ?? null,
      timezone: store.timezone,
      hours: store.hours,
    });
    await tx.insert(menuCategories).values(menu.categories);
    await tx.insert(menuItems).values(
      menu.items.map((item, sortOrder) => ({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description ?? null,
        priceCents: item.priceCents,
        currency: item.currency,
        tags: item.tags,
        colour: item.colour,
        pearls: item.pearls,
        sortOrder,
      })),
    );
    await tx.insert(optionLevels).values([
      ...menu.customisations.sugarLevels.map((level, sortOrder) => ({
        ...level,
        group: 'sugar' as const,
        sortOrder,
      })),
      ...menu.customisations.iceLevels.map((level, sortOrder) => ({
        ...level,
        group: 'ice' as const,
        sortOrder,
      })),
    ]);
    await tx
      .insert(toppings)
      .values(
        menu.customisations.toppings.map((topping, sortOrder) => ({ ...topping, sortOrder })),
      );
  });
}
