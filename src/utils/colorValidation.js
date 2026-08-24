/**
 * Color validation utilities for theme and color management
 */

/**
 * Validates if a color is white, near-white, or too light for UI visibility
 * @param {string} color - Hex color code (e.g., "#ffffff" or "#fff")
 * @returns {boolean} - Returns true if color is too light/white
 */
export const isWhiteColor = (color) => {
  if (!color) return false;
  
  const normalizedColor = color.toLowerCase();
  
  // Check for exact white and near-white hex codes
  const whiteVariants = [
    '#ffffff', '#fff', '#fefefe', '#fdfdfd', '#fcfcfc', '#fbfbfb', 
    '#fafafa', '#f9f9f9', '#f8f8f8', '#f7f7f7', '#f6f6f6', '#f5f5f5',
    '#f4f4f4', '#f3f3f3', '#f2f2f2', '#f1f1f1', '#f0f0f0'
  ];
  if (whiteVariants.includes(normalizedColor)) return true;
  
  // Convert hex to RGB and check if values are too light
  let hex = normalizedColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  if (hex.length === 6) {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // More strict validation: Consider it too light if:
    // 1. All RGB values are 240 or higher (very light colors)
    // 2. The average RGB value is 235 or higher (light grays)
    // 3. All RGB values are within 15 points of each other and above 220 (light grays)
    const avgRgb = (r + g + b) / 3;
    const maxDiff = Math.max(r, g, b) - Math.min(r, g, b);
    
    return (r >= 240 && g >= 240 && b >= 240) || 
           (avgRgb >= 235) || 
           (maxDiff <= 15 && r >= 220 && g >= 220 && b >= 220);
  }
  
  return false;
};

/**
 * Validates if a color has sufficient contrast for UI elements
 * @param {string} color - Hex color code
 * @returns {boolean} - Returns true if color has good contrast
 */
export const hasGoodContrast = (color) => {
  return !isWhiteColor(color);
};

/**
 * Get RGB values from hex color
 * @param {string} hex - Hex color code
 * @returns {object} - Object with r, g, b values or null if invalid
 */
export const hexToRgb = (hex) => {
  if (!hex || typeof hex !== "string") return null;
  
  const normalizedHex = hex.replace('#', '');
  let fullHex = normalizedHex;
  
  if (normalizedHex.length === 3) {
    fullHex = normalizedHex.split('').map(char => char + char).join('');
  }
  
  if (fullHex.length === 6) {
    const r = parseInt(fullHex.substr(0, 2), 16);
    const g = parseInt(fullHex.substr(2, 2), 16);
    const b = parseInt(fullHex.substr(4, 2), 16);
    return { r, g, b };
  }
  
  return null;
};

/**
 * Convert hex color to RGB string format
 * @param {string} hex - Hex color code
 * @returns {string} - RGB string (e.g., "rgb(255, 0, 0)") or empty string if invalid
 */
export const hexToRgbString = (hex) => {
  const rgb = hexToRgb(hex);
  if (rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }
  return "";
};