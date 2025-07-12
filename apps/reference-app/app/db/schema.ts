import { pgTable, text, timestamp, varchar, boolean, uuid, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("users", {
  id: uuid("id")
    .$defaultFn(() => crypto.randomUUID())
    .primaryKey(),
  email: text("email").notNull().unique(),
  lastLogin: timestamp("last_login"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isValidated: boolean("is_validated").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id")
    .$defaultFn(() => crypto.randomUUID())
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("todo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userStatusIdx: index("tasks_user_id_status_idx").on(table.userId, table.status),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert; 