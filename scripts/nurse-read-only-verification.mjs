const TARGET_NAME = 'Emily Plaatjies';

/**
 * Reduce an already-authorized, read-only nurse response to the only fields
 * approved for production verification output. This function performs no I/O
 * and intentionally has no mutation capability.
 */
export function summarizeEmilyReadOnly(rows) {
  const matches = Array.isArray(rows)
    ? rows.filter((row) => row && row.full_name === TARGET_NAME)
    : [];
  const exactlyOne = matches.length === 1;
  const row = exactlyOne ? matches[0] : null;
  const version = row?.version;
  const ownerAssigned =
    typeof row?.owner_id === 'string' ? row.owner_id.trim().length > 0 : row?.owner_id != null;
  const versionValid = Number.isInteger(version) && version > 0;

  return Object.freeze({
    exactly_one: exactlyOne,
    owner_assigned: exactlyOne && ownerAssigned,
    version_valid: exactlyOne && versionValid,
    current_version: exactlyOne && versionValid ? version : null,
  });
}
