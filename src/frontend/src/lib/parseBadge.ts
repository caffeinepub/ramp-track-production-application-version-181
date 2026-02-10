/**
 * Parse badge ID from raw scanner input.
 * Extracts the longest digit sequence from input text while preserving leading zeros.
 * Returns null if the result length is less than 4.
 * 
 * @param raw - Raw input string from scanner (QR code, barcode, or keyboard wedge)
 * @returns Parsed badge ID string or null if invalid
 */
export function parseBadgeId(raw: string): string | null {
  // Trim whitespace
  const trimmed = raw.trim();
  
  if (!trimmed) {
    return null;
  }
  
  // Extract all digit sequences from the input
  const digitSequences = trimmed.match(/\d+/g);
  
  if (!digitSequences || digitSequences.length === 0) {
    return null;
  }
  
  // Find the longest digit sequence
  let longestSequence = '';
  for (const sequence of digitSequences) {
    if (sequence.length > longestSequence.length) {
      longestSequence = sequence;
    }
  }
  
  // Return null if the result length is less than 4
  if (longestSequence.length < 4) {
    return null;
  }
  
  return longestSequence;
}
