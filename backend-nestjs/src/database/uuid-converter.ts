export function convertUuidToIntegerId(uuid: string): number {
  if (!uuid) return 0;
  const parts = uuid.split('-');
  const lastPart = parts[parts.length - 1];
  const parsed = parseInt(lastPart, 10);
  return isNaN(parsed) ? 0 : parsed;
}
