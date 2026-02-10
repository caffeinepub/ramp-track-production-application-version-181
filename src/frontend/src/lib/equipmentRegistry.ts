// Client-side Equipment Registry with localStorage persistence

export type EquipmentType = 'TUG' | 'ELECTRIC_TUG' | 'STANDUP_PUSHBACK' | 'LAMBO_PUSHBACK';
export type EquipmentStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE';

export interface EquipmentRecord {
  id: string;
  type: EquipmentType;
  label?: string;
  status: EquipmentStatus;
  createdAt: string;
  lastOperator?: string;
  checkoutTime?: string;
  returnTime?: string;
  location?: string;
  maintenanceNotes?: string;
  history: HistoryEntry[];
}

export interface HistoryEntry {
  timestamp: string;
  action: 'CHECKOUT' | 'RETURN' | 'MAINTENANCE' | 'CREATED';
  operator?: string;
  location?: string;
  notes?: string;
}

const STORAGE_KEY = 'ramptrack_equipment_registry';
const INIT_FLAG_KEY = 'ramptrack_tugs_initialized_v3';

// Electric TUG IDs (specific list from requirements)
const ELECTRIC_TUG_IDS = [
  'TV1077', 'TV1078', 'TV1079', 'TV1080', 'TV1081', 'TV1082', 'TV1083', 'TV1084',
  'TV1088', 'TV1089', 'TV1280', 'TV1341', 'TV1342', 'TV1343', 'TV1344'
];

// Additional equipment IDs that must exist
const REQUIRED_EQUIPMENT: Array<{ id: string; type: EquipmentType; isElectric: boolean }> = [
  { id: 'TV0637', type: 'TUG', isElectric: false },
  { id: 'TV1077', type: 'ELECTRIC_TUG', isElectric: true },
  { id: 'TV0883', type: 'TUG', isElectric: false },
  { id: 'TV0989', type: 'TUG', isElectric: false },
  { id: 'TV0884', type: 'TUG', isElectric: false },
];

/**
 * Normalize equipment ID for lookup
 * 1. Trim whitespace
 * 2. Convert to uppercase
 * 3. Remove internal spaces
 * 4. Extract TV#### pattern if found within suffix/prefix text (including URLs or "ID:TV####")
 */
export function normalizeEquipmentId(rawId: string): string {
  if (!rawId) return '';
  
  // Step 1: Trim whitespace
  let normalized = rawId.trim();
  
  // Step 2: Convert to uppercase
  normalized = normalized.toUpperCase();
  
  // Step 3: Remove internal spaces
  normalized = normalized.replace(/\s+/g, '');
  
  // Step 4: Extract TV#### pattern if found
  // Match TV followed by 4 digits
  const tvPattern = /TV\d{4}/;
  const match = normalized.match(tvPattern);
  
  if (match) {
    normalized = match[0];
  }
  
  // Remove common prefixes
  if (normalized.startsWith('RAMPTRACK:')) {
    normalized = normalized.substring('RAMPTRACK:'.length);
  }
  if (normalized.startsWith('ID:')) {
    normalized = normalized.substring('ID:'.length);
  }
  
  return normalized;
}

// Initialize TUG equipment on first load
function initializeTugs() {
  const initialized = localStorage.getItem(INIT_FLAG_KEY);
  if (initialized) {
    // Check if required equipment exists, add if missing
    const allEquipment = getAllEquipmentRaw();
    let needsUpdate = false;
    
    for (const required of REQUIRED_EQUIPMENT) {
      const exists = allEquipment.some(e => e.id === required.id);
      if (!exists) {
        console.log(`[equipmentRegistry] Adding missing required equipment: ${required.id}`);
        const newEquipment: EquipmentRecord = {
          id: required.id,
          type: required.isElectric ? 'ELECTRIC_TUG' : 'TUG',
          status: 'AVAILABLE',
          createdAt: new Date().toISOString(),
          history: [{
            timestamp: new Date().toISOString(),
            action: 'CREATED',
            notes: required.isElectric ? 'Auto-imported electric tug' : 'Auto-imported diesel/gas tug'
          }]
        };
        allEquipment.push(newEquipment);
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEquipment));
    }
    
    return;
  }

  // Clear old data and start fresh
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('ramptrack_tugs_initialized');
  localStorage.removeItem('ramptrack_tugs_initialized_v2');
  
  const allEquipment: EquipmentRecord[] = [];
  
  // Add required equipment first
  for (const required of REQUIRED_EQUIPMENT) {
    const newEquipment: EquipmentRecord = {
      id: required.id,
      type: required.isElectric ? 'ELECTRIC_TUG' : 'TUG',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      history: [{
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        notes: required.isElectric ? 'Auto-imported electric tug' : 'Auto-imported diesel/gas tug'
      }]
    };
    allEquipment.push(newEquipment);
  }
  
  // Generate TV0989 to TV1344 (inclusive) - full fleet range
  for (let i = 989; i <= 1344; i++) {
    const tugId = `TV${String(i).padStart(4, '0')}`;
    
    // Skip if already added in required equipment
    if (allEquipment.some(e => e.id === tugId)) {
      continue;
    }
    
    // Determine if this is an electric tug based on the specific list
    const isElectric = ELECTRIC_TUG_IDS.includes(tugId);
    
    const newTug: EquipmentRecord = {
      id: tugId,
      type: isElectric ? 'ELECTRIC_TUG' : 'TUG',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      history: [{
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        notes: isElectric ? 'Auto-imported electric tug' : 'Auto-imported diesel/gas tug'
      }]
    };
    
    allEquipment.push(newTug);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allEquipment));
  localStorage.setItem(INIT_FLAG_KEY, 'true');
}

// Get all equipment from localStorage (raw, no normalization)
function getAllEquipmentRaw(): EquipmentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const equipment = JSON.parse(data) as EquipmentRecord[];
    
    // Ensure all equipment has history array
    return equipment.map(e => ({
      ...e,
      history: e.history || []
    }));
  } catch (error) {
    console.error('Error reading equipment registry:', error);
    return [];
  }
}

// Get all equipment from localStorage
export function getAllEquipment(): EquipmentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      initializeTugs();
      const newData = localStorage.getItem(STORAGE_KEY);
      return newData ? JSON.parse(newData) : [];
    }
    const equipment = JSON.parse(data) as EquipmentRecord[];
    
    // Ensure all equipment has history array
    return equipment.map(e => ({
      ...e,
      history: e.history || []
    }));
  } catch (error) {
    console.error('Error reading equipment registry:', error);
    return [];
  }
}

// Add new equipment
export function addEquipment(equipment: Omit<EquipmentRecord, 'createdAt' | 'status' | 'history'>): { success: boolean; error?: string } {
  try {
    const allEquipment = getAllEquipment();
    
    // Normalize and clean ID
    let equipmentId = normalizeEquipmentId(equipment.id);
    
    // Check for duplicate ID
    if (allEquipment.some(e => e.id === equipmentId)) {
      return { success: false, error: 'Equipment ID already exists' };
    }
    
    // Determine equipment type based on ID
    let equipmentType = equipment.type;
    if (equipmentType === 'TUG' || equipmentType === 'ELECTRIC_TUG') {
      // Check if it's one of the specific electric tugs
      if (ELECTRIC_TUG_IDS.includes(equipmentId)) {
        equipmentType = 'ELECTRIC_TUG';
      } else {
        equipmentType = 'TUG'; // Standard TUG (Gas/Diesel)
      }
    }
    
    const newEquipment: EquipmentRecord = {
      ...equipment,
      id: equipmentId,
      type: equipmentType,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      history: [{
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        notes: 'Equipment added to registry'
      }]
    };
    
    allEquipment.push(newEquipment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allEquipment));
    
    return { success: true };
  } catch (error) {
    console.error('Error adding equipment:', error);
    return { success: false, error: 'Failed to add equipment' };
  }
}

// Update equipment status with history
export function updateEquipmentStatus(
  id: string, 
  status: EquipmentStatus,
  operator?: string,
  location?: string,
  notes?: string
): { success: boolean; error?: string } {
  try {
    const allEquipment = getAllEquipment();
    
    // Normalize ID
    const equipmentId = normalizeEquipmentId(id);
    
    const index = allEquipment.findIndex(e => e.id === equipmentId);
    
    if (index === -1) {
      return { success: false, error: 'Equipment not found' };
    }
    
    const timestamp = new Date().toISOString();
    const equipment = allEquipment[index];
    
    // Determine action type
    let action: 'CHECKOUT' | 'RETURN' | 'MAINTENANCE' | 'CREATED' = 'CREATED';
    if (status === 'ASSIGNED') {
      action = 'CHECKOUT';
      equipment.checkoutTime = timestamp;
      equipment.lastOperator = operator;
    } else if (status === 'AVAILABLE') {
      action = 'RETURN';
      equipment.returnTime = timestamp;
    } else if (status === 'MAINTENANCE') {
      action = 'MAINTENANCE';
      equipment.maintenanceNotes = notes;
    }
    
    // Update equipment
    equipment.status = status;
    if (location) equipment.location = location;
    
    // Add history entry
    if (!equipment.history) equipment.history = [];
    equipment.history.push({
      timestamp,
      action,
      operator,
      location,
      notes
    });
    
    allEquipment[index] = equipment;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allEquipment));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment status:', error);
    return { success: false, error: 'Failed to update equipment status' };
  }
}

// Update equipment details
export function updateEquipment(id: string, updates: Partial<Omit<EquipmentRecord, 'id' | 'createdAt'>>): { success: boolean; error?: string } {
  try {
    const allEquipment = getAllEquipment();
    
    // Normalize ID
    const equipmentId = normalizeEquipmentId(id);
    
    const index = allEquipment.findIndex(e => e.id === equipmentId);
    
    if (index === -1) {
      return { success: false, error: 'Equipment not found' };
    }
    
    allEquipment[index] = {
      ...allEquipment[index],
      ...updates,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allEquipment));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment:', error);
    return { success: false, error: 'Failed to update equipment' };
  }
}

// Find equipment by ID (with normalization)
export function findById(id: string): EquipmentRecord | null {
  const allEquipment = getAllEquipment();
  
  // Normalize ID
  const equipmentId = normalizeEquipmentId(id);
  
  return allEquipment.find(e => e.id === equipmentId) || null;
}

// Get equipment counts by status
export function getEquipmentCounts() {
  const allEquipment = getAllEquipment();
  return {
    total: allEquipment.length,
    available: allEquipment.filter(e => e.status === 'AVAILABLE').length,
    assigned: allEquipment.filter(e => e.status === 'ASSIGNED').length,
    maintenance: allEquipment.filter(e => e.status === 'MAINTENANCE').length,
  };
}

// Initialize on module load
initializeTugs();
