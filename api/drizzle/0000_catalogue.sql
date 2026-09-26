CREATE TYPE "public"."option_group" AS ENUM('sugar', 'ice');--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"tags" text[] NOT NULL,
	"colour" text NOT NULL,
	"pearls" boolean NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"option_group" "option_group" NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"address_lines" text[] NOT NULL,
	"suburb" text NOT NULL,
	"state" text NOT NULL,
	"postcode" text NOT NULL,
	"phone" text,
	"timezone" text NOT NULL,
	"hours" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "toppings" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE no action ON UPDATE no action;