// In-memory equipment event history system

export type EventType = 'CHECK_OUT' | 'CHECK_IN' | 'REPORT_ISSUE';

export interface EquipmentEvent {
  id: string;
  equipmentId: string;
  eventType: EventType;
  operator: string;
  timestamp: string;
  location?: string;
  notes?: string;
}

// In-memory storage
let eventHistory: EquipmentEvent[] = [];

/**
 * Log a new equipment event
 */
export function logEvent(event: EquipmentEvent): void {
  eventHistory.push(event);
}

/**
 * Get all events for a specific equipment ID, sorted newest-first
 */
export function getHistoryForEquipment(equipmentId: string): EquipmentEvent[] {
  return eventHistory
    .filter(event => event.equipmentId === equipmentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get all events, sorted newest-first
 */
export function getAllHistory(): EquipmentEvent[] {
  return eventHistory
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Clear all history (for testing/reset purposes)
 */
export function clearHistory(): void {
  eventHistory = [];
}
