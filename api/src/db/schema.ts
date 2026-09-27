import type { Store } from '@bbt/shared';
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Catalogue tables. Column shapes mirror the shared contract so the Postgres catalogue can
 * rebuild `Store` and `Menu` without translation beyond snake_case and nullability.
 * `sort_order` columns preserve the display order that the seed lists things in.
 */

export const stores = pgTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  addressLines: text('address_lines').array().notNull(),
  suburb: text('suburb').notNull(),
  state: text('state').notNull(),
  postcode: text('postcode').notNull(),
  phone: text('phone'),
  timezone: text('timezone').notNull(),
  hours: jsonb('hours').$type<Store['hours']>().notNull(),
});

export const menuCategories = pgTable('menu_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const menuItems = pgTable('menu_items', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => menuCategories.id),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull(),
  tags: text('tags').array().notNull(),
  colour: text('colour').notNull(),
  pearls: boolean('pearls').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const optionGroup = pgEnum('option_group', ['sugar', 'ice']);

/** Sugar and ice levels share one table, told apart by `option_group`. */
export const optionLevels = pgTable('option_levels', {
  id: text('id').primaryKey(),
  group: optionGroup('option_group').notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const toppings = pgTable('toppings', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

/**
 * Accounts. Owned by the Postgres accounts provider (src/accounts/postgres.ts); nothing else
 * reads or writes these tables, so a different provider can leave them behind.
 * The seed never touches them; only a wipe does.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  /** Lower cased and trimmed before it gets here. */
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const sessions = pgTable('sessions', {
  /** SHA-256 of the bearer token. The token itself is never stored. */
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
