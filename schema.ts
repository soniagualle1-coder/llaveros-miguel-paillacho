import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  contact: text("contact").notNull(),
  address: text("address").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(250),
  extrasTotal: integer("extras_total").notNull().default(0),
  total: integer("total").notNull().default(250),
  design: jsonb("design").notNull(),
  image: text("image").notNull().default(""),
  drawing: text("drawing").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
