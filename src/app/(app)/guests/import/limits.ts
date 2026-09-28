/**
 * Largest CSV the import accepts, in characters. Server Action requests are capped at 1 MB, and
 * a guest list is a few hundred rows, so this leaves plenty of room either way.
 */
export const MAX_CSV_CHARS = 800_000;
