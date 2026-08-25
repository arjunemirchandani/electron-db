CREATE VIRTUAL TABLE `notes_fts` USING fts5(
	`title`,
	`content`,
	content='notes',
	content_rowid='id',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER `notes_fts_after_insert` AFTER INSERT ON `notes` BEGIN
	INSERT INTO `notes_fts`(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_after_delete` AFTER DELETE ON `notes` BEGIN
	INSERT INTO `notes_fts`(`notes_fts`, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_after_update` AFTER UPDATE ON `notes` BEGIN
	INSERT INTO `notes_fts`(`notes_fts`, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
	INSERT INTO `notes_fts`(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
--> statement-breakpoint
INSERT INTO `notes_fts`(rowid, title, content) SELECT id, title, content FROM `notes`;
