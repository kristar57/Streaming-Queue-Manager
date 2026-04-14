-- Add 'anticipated' as a valid entry status.
-- This covers unreleased/in-production titles that are on the radar
-- but not yet available to watch (between "Up next" and "Watched").
ALTER TYPE entry_status ADD VALUE IF NOT EXISTS 'anticipated';
