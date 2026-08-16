/**
 * The API refuses a bad week with one message naming the day and the field:
 *
 *   "2026-08-14: Labour cost must be greater than or equal to 0"
 *
 * Shown as-is it is a banner the reader has to translate into "which box do I
 * fix" while looking at twenty-eight of them. Parsing it lets the error sit
 * against the offending input instead.
 */

export interface FieldError {
  date: string;
  field: "pos_revenue" | "eatclub_revenue" | "labour_cost" | "covers";
  message: string;
}

const FIELD_BY_HUMAN_NAME: Record<string, FieldError["field"]> = {
  "pos revenue": "pos_revenue",
  "eatclub revenue": "eatclub_revenue",
  "labour cost": "labour_cost",
  covers: "covers",
};

/** Null when the message is not the shape above — then it stays a banner. */
export function parseSaveError(message: string): FieldError | null {
  const match = /^(\d{4}-\d{2}-\d{2}):\s*(.+)$/.exec(message.trim());
  if (!match) return null;

  const [, date, detail] = match;

  // Rails leads the sentence with the humanised attribute name, so the longest
  // matching name wins — "labour cost" before a hypothetical "cost".
  const name = Object.keys(FIELD_BY_HUMAN_NAME)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => detail.toLowerCase().startsWith(candidate));

  if (!name) return null;

  return { date, field: FIELD_BY_HUMAN_NAME[name], message: detail };
}
