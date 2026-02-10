/**
 * Full user roster data for authentication and badge lookup.
 * This data is used for validating badge scans and manual logins.
 * DO NOT modify this file - it contains the complete employee database.
 */

export interface UserRosterEntry {
  badgeId: string;
  email?: string;
  password?: string;
  role: 'admin' | 'manager' | 'agent' | 'operator';
  displayName: string;
  employeeId: string;
}

/**
 * Complete user roster including all employees.
 * Badge 970251 is the manager badge for Jayson James.
 * Demo credentials are included for testing purposes.
 */
export const USER_ROSTER: UserRosterEntry[] = [
  // Demo user for UI display
  {
    badgeId: 'DEMO001',
    email: 'operator@demo.com',
    password: 'test123',
    role: 'agent',
    displayName: 'Demo Operator',
    employeeId: 'DEMO001',
  },
  
  // Manager badge - 970251 (Jayson James) - RESTORED WITH CORRECT CREDENTIALS
  {
    badgeId: '970251',
    email: '970251',
    password: 'test123',
    role: 'manager',
    displayName: 'Jayson James',
    employeeId: '970251',
  },
  
  // Admin users
  {
    badgeId: '970231',
    email: 'admin1@ramptrack.com',
    password: 'admin123',
    role: 'admin',
    displayName: 'Admin User 1',
    employeeId: '970231',
  },
  {
    badgeId: '970232',
    email: 'admin2@ramptrack.com',
    password: 'admin123',
    role: 'admin',
    displayName: 'Admin User 2',
    employeeId: '970232',
  },
  
  // Agent users
  {
    badgeId: '970233',
    email: 'agent1@ramptrack.com',
    password: 'agent123',
    role: 'agent',
    displayName: 'Agent User 1',
    employeeId: '970233',
  },
  {
    badgeId: '970234',
    email: 'agent2@ramptrack.com',
    password: 'agent123',
    role: 'agent',
    displayName: 'Agent User 2',
    employeeId: '970234',
  },
  {
    badgeId: '970235',
    email: 'agent3@ramptrack.com',
    password: 'agent123',
    role: 'agent',
    displayName: 'Agent User 3',
    employeeId: '970235',
  },
  
  // Operator users (6-digit badges)
  {
    badgeId: '970301',
    role: 'operator',
    displayName: 'Operator 1',
    employeeId: '970301',
  },
  {
    badgeId: '970302',
    role: 'operator',
    displayName: 'Operator 2',
    employeeId: '970302',
  },
  {
    badgeId: '970303',
    role: 'operator',
    displayName: 'Operator 3',
    employeeId: '970303',
  },
  {
    badgeId: '970304',
    role: 'operator',
    displayName: 'Operator 4',
    employeeId: '970304',
  },
  {
    badgeId: '970305',
    role: 'operator',
    displayName: 'Operator 5',
    employeeId: '970305',
  },
  {
    badgeId: '970306',
    role: 'operator',
    displayName: 'Operator 6',
    employeeId: '970306',
  },
  {
    badgeId: '970307',
    role: 'operator',
    displayName: 'Operator 7',
    employeeId: '970307',
  },
  {
    badgeId: '970308',
    role: 'operator',
    displayName: 'Operator 8',
    employeeId: '970308',
  },
  {
    badgeId: '970309',
    role: 'operator',
    displayName: 'Operator 9',
    employeeId: '970309',
  },
  {
    badgeId: '970310',
    role: 'operator',
    displayName: 'Operator 10',
    employeeId: '970310',
  },
  
  // Additional operators with 8-digit badges
  {
    badgeId: '97025101',
    role: 'operator',
    displayName: 'Operator 11',
    employeeId: '97025101',
  },
  {
    badgeId: '97025102',
    role: 'operator',
    displayName: 'Operator 12',
    employeeId: '97025102',
  },
  {
    badgeId: '97025103',
    role: 'operator',
    displayName: 'Operator 13',
    employeeId: '97025103',
  },
  {
    badgeId: '97025104',
    role: 'operator',
    displayName: 'Operator 14',
    employeeId: '97025104',
  },
  {
    badgeId: '97025105',
    role: 'operator',
    displayName: 'Operator 15',
    employeeId: '97025105',
  },
];

/**
 * Normalize string for comparison - trim whitespace and convert to string.
 * Ensures consistent string handling across all authentication methods.
 */
function normalizeString(input: string | undefined | null): string {
  return String(input || '').trim();
}

/**
 * Lookup user by badge ID with string normalization.
 * Returns user data if badge exists in roster, null otherwise.
 */
export function lookupUserByBadge(badgeId: string): UserRosterEntry | null {
  const normalizedInput = normalizeString(badgeId);
  return USER_ROSTER.find(user => normalizeString(user.badgeId) === normalizedInput) || null;
}

/**
 * Lookup user by email or username with string normalization.
 * Returns user data if email/username exists in roster, null otherwise.
 */
export function lookupUserByEmail(email: string): UserRosterEntry | null {
  const normalizedInput = normalizeString(email).toLowerCase();
  return USER_ROSTER.find(user => {
    const normalizedEmail = normalizeString(user.email).toLowerCase();
    const normalizedBadge = normalizeString(user.badgeId).toLowerCase();
    return normalizedEmail === normalizedInput || normalizedBadge === normalizedInput;
  }) || null;
}

/**
 * Validate user credentials (email/username + password) with string normalization.
 * Returns user data if credentials are valid, null otherwise.
 */
export function validateCredentials(email: string, password: string): UserRosterEntry | null {
  const user = lookupUserByEmail(email);
  if (!user || !user.password) {
    return null;
  }
  return user.password === password ? user : null;
}

/**
 * Validate badge scan with string normalization.
 * Returns user data if badge exists in roster, null otherwise.
 */
export function validateBadgeScan(badgeId: string): UserRosterEntry | null {
  return lookupUserByBadge(badgeId);
}

/**
 * Get demo credentials for UI display only.
 * This is the ONLY credential that should be shown in the UI.
 */
export function getDemoCredentials(): { email: string; password: string } {
  return {
    email: 'operator@demo.com',
    password: 'test123',
  };
}
