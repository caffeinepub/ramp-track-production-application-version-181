// Audit Log Module - Comprehensive scan event tracking system with GPS data

import { useAuth } from '../contexts/AuthContext';

export interface ScanEvent {
  id: string;
  timestamp: string;
  action: 'checkin' | 'checkout';
  equipmentId: string;
  locationLabel: string;
  lat: number;
  lng: number;
  accuracyMeters: number;
  user: {
    badge: string;
    username: string;
    displayName: string;
    roles: string[];
  };
}

const AUDIT_LOG_KEY = 'ramptrack_scan_audit';
const MAX_AUDIT_EVENTS = 250;

/**
 * Get current user from AuthContext or localStorage fallback
 */
export function getCurrentUser(): ScanEvent['user'] {
  // Try to get from new AuthContext storage first
  const authUser = localStorage.getItem('ramptrack_current_user');
  if (authUser) {
    try {
      const user = JSON.parse(authUser);
      return {
        badge: user.badge || user.username || 'unknown',
        username: user.username || 'unknown',
        displayName: user.displayName || user.username || 'Unknown User',
        roles: user.roles || ['agent'],
      };
    } catch (e) {
      console.error('Error parsing auth user:', e);
    }
  }

  // Fallback to legacy storage
  const currentUser = localStorage.getItem('currentUser');
  const currentUserBadge = localStorage.getItem('currentUser_badge');
  
  if (currentUser) {
    try {
      const user = JSON.parse(currentUser);
      return {
        badge: currentUserBadge || user.username || 'unknown',
        username: user.username || 'unknown',
        displayName: user.displayName || user.username || 'Unknown User',
        roles: user.roles || ['agent'],
      };
    } catch (e) {
      console.error('Error parsing current user:', e);
    }
  }
  
  return {
    badge: 'unknown',
    username: 'unknown',
    displayName: 'Unknown User',
    roles: ['agent'],
  };
}

/**
 * Load all audit events from localStorage
 */
export function loadAuditEvents(): ScanEvent[] {
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY);
    if (!data) return [];
    return JSON.parse(data) as ScanEvent[];
  } catch (e) {
    console.error('Error loading audit events:', e);
    return [];
  }
}

/**
 * Append a new audit event (prepends to array, trims to max 250)
 */
export function appendAuditEvent(event: Omit<ScanEvent, 'id' | 'timestamp'>): void {
  try {
    const events = loadAuditEvents();
    
    // Generate unique ID
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create complete event
    const newEvent: ScanEvent = {
      id,
      timestamp: new Date().toISOString(),
      ...event,
    };
    
    // Prepend new event (newest first)
    events.unshift(newEvent);
    
    // Trim to max size
    const trimmedEvents = events.slice(0, MAX_AUDIT_EVENTS);
    
    // Save back to localStorage
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedEvents));
  } catch (e) {
    console.error('Error appending audit event:', e);
  }
}

/**
 * Filter events by equipment ID
 */
export function getEventsByEquipment(equipmentId: string): ScanEvent[] {
  const events = loadAuditEvents();
  return events.filter(e => e.equipmentId === equipmentId);
}

/**
 * Filter events by user (badge or username)
 */
export function getEventsByUser(userIdentifier: string): ScanEvent[] {
  const events = loadAuditEvents();
  const lowerIdentifier = userIdentifier.toLowerCase();
  return events.filter(e => 
    e.user.badge.toLowerCase().includes(lowerIdentifier) ||
    e.user.username.toLowerCase().includes(lowerIdentifier) ||
    e.user.displayName.toLowerCase().includes(lowerIdentifier)
  );
}

/**
 * Clear all audit events (admin only)
 */
export function clearAuditEvents(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}
