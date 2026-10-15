import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const aiProviderSettings=sqliteTable('ai_provider_settings',{
 ownerId:text('owner_id').notNull(),provider:text('provider').notNull(),model:text('model').notNull(),baseUrl:text('base_url').notNull(),keyCipher:text('key_cipher').notNull(),envKeyDisabled:integer('env_key_disabled').notNull().default(0),
},t=>[primaryKey({columns:[t.ownerId,t.provider]})]);
export const aiProviderPreferences=sqliteTable('ai_provider_preferences',{
 ownerId:text('owner_id').primaryKey(),provider:text('provider').notNull(),
});
