// Shared display labels for the pick values used across the app.

export const SETTINGS = [
  { id: 'nature', label: 'Nature', emoji: '🌳' },
  { id: 'neighborhood', label: 'Neighborhood', emoji: '🏘️' },
  { id: 'downtown', label: 'Downtown', emoji: '🏙️' },
  { id: 'home', label: 'Backyard & Home', emoji: '🏠' },
];

export const DURATIONS = [
  { id: 'quick', label: '30 minutes', emoji: '⚡' },
  { id: 'afternoon', label: 'An afternoon', emoji: '🌤️' },
  { id: 'allday', label: 'All day', emoji: '🌅' },
];

export const DRIVES = [
  { id: 'here', label: 'Right here', emoji: '🚶' },
  { id: 'short', label: 'A short drive', emoji: '🚗' },
  { id: 'far', label: 'Worth the drive', emoji: '🛣️' },
];

export const COST_PICKS = [
  { id: 'free', label: 'Free', emoji: '🆓' },
  { id: 'few', label: 'A few bucks', emoji: '💵' },
];

export const COST_BADGE = { free: 'Free', $: 'A few bucks', $$: 'A bigger treat' };

export function labelOf(list, id) {
  const found = list.find((x) => x.id === id);
  return found ? `${found.emoji} ${found.label}` : id;
}

export function driveBadge(drive) {
  return labelOf(DRIVES, drive);
}

export function costBadge(cost) {
  return COST_BADGE[cost] || cost;
}
