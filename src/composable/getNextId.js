export function getNextNumberId(lastNumber) {
    if (!lastNumber) return '000001'; // If null, start from "000001"

    const match = lastNumber.match(/(\d+)$/); // Extract numeric part at the end
    if (!match) return '000001';

    let numPart = parseInt(match[1], 10) + 1; // Convert to integer and increment
    return String(numPart).padStart(6, '0'); // Ensure 6-digit format
}