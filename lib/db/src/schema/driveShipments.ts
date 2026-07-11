import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { reportRevisionsTable } from "./reportRevisions";

// A record of a validated report PDF that was shipped to Google Drive
// ("INVESQ Customers/{Firm}/{Company}/{Company} - CS Diagnostic - {date}.pdf").
// Append-only audit trail: fileId + webViewLink identify the uploaded file,
// revisionId ties the shipment to exactly which validated revision went out.
export const driveShipmentsTable = pgTable(
  "drive_shipments",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id),
    revisionId: integer("revision_id")
      .notNull()
      .references(() => reportRevisionsTable.id),
    fileId: text("file_id").notNull(),
    webViewLink: text("web_view_link"),
    folderPath: text("folder_path").notNull(),
    shippedByEmail: text("shipped_by_email").notNull(),
    shippedByName: text("shipped_by_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("drive_shipments_company_id_idx").on(table.companyId)],
);

export const insertDriveShipmentSchema = createInsertSchema(driveShipmentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDriveShipment = z.infer<typeof insertDriveShipmentSchema>;
export type DriveShipment = typeof driveShipmentsTable.$inferSelect;
