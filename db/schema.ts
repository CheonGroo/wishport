import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), googleSub: text('google_sub').unique(), email: text('email').notNull(),
  name: text('name'), picture: text('picture'), createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), expiresAt: integer('expires_at').notNull(), createdAt: integer('created_at').notNull(),
});
export const archiveDocuments = sqliteTable('archive_documents', {
  userId: text('user_id').primaryKey(), payload: text('payload').notNull(), version: integer('version').notNull().default(1), updatedAt: integer('updated_at').notNull(),
});
export const aiRuns = sqliteTable('ai_runs', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), kind: text('kind').notNull(), inputHash: text('input_hash'), model: text('model'), status: text('status').notNull(), output: text('output'), createdAt: integer('created_at').notNull(),
});
