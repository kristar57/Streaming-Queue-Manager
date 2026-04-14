-- Rename the entry status enum value from 'anticipated' to 'upcoming'.
-- PostgreSQL renames the enum value in place — no row updates needed.
ALTER TYPE entry_status RENAME VALUE 'anticipated' TO 'upcoming';
