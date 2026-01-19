CREATE TYPE "public"."edition_type" AS ENUM('issue', 'tpb', 'omnibus');--> statement-breakpoint
CREATE TYPE "public"."request_state" AS ENUM('draft', 'requested', 'searching', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."series_status" AS ENUM('ongoing', 'ended', 'canceled');--> statement-breakpoint
CREATE TABLE "library_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"komga_series_id" text NOT NULL,
	"local_title" text NOT NULL,
	"komga_folder_path" text,
	"series_id" uuid,
	"match_confidence" real DEFAULT 0,
	"is_manually_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_mapping_komga_series_id_unique" UNIQUE("komga_series_id")
);
--> statement-breakpoint
CREATE TABLE "request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"edition" "edition_type" NOT NULL,
	"state" "request_state" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_year" integer NOT NULL,
	"publisher" varchar(255),
	"description" text,
	"status" "series_status" NOT NULL,
	"thumbnail_url" text,
	"comicvine_id" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "library_mapping" ADD CONSTRAINT "library_mapping_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;