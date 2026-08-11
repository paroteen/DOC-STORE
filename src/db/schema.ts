import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at').notNull().default(Date.now()),
  updatedAt: integer('updated_at').notNull().default(Date.now()),
});
