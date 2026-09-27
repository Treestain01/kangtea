CREATE TABLE "loyalty_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"redeemed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_stamps" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stamp_key" text NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"colour" text NOT NULL,
	"earned_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_stamps" ADD CONSTRAINT "loyalty_stamps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_stamps_user_key" ON "loyalty_stamps" USING btree ("user_id","stamp_key");