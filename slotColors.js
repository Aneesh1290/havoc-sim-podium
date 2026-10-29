/**
 * Havoc Sim Podium & Havoc RC Fun Zone - Unified Wristband Color & Time Slot Palette
 */

const WRISTBAND_PALETTE = [
  { hex: "#FFF0B3", name: "Yellow",           bgClass: "bg-yellow-100",  textClass: "text-yellow-800", borderClass: "border-yellow-300", ringClass: "ring-yellow-400" },
  { hex: "#10B981", name: "Green",            bgClass: "bg-emerald-100", textClass: "text-emerald-800", borderClass: "border-emerald-300", ringClass: "ring-emerald-400" },
  { hex: "#EF4444", name: "Red",              bgClass: "bg-rose-100",    textClass: "text-rose-800", borderClass: "border-rose-300", ringClass: "ring-rose-400" },
  { hex: "#3B82F6", name: "Blue",             bgClass: "bg-blue-100",    textClass: "text-blue-800", borderClass: "border-blue-300", ringClass: "ring-blue-400" },
  { hex: "#F97316", name: "Orange",           bgClass: "bg-orange-100",  textClass: "text-orange-800", borderClass: "border-orange-300", ringClass: "ring-orange-400" },
  { hex: "#8B5CF6", name: "Purple",           bgClass: "bg-purple-100",  textClass: "text-purple-800", borderClass: "border-purple-300", ringClass: "ring-purple-400" },
  { hex: "#18181B", name: "Black",            bgClass: "bg-zinc-800",    textClass: "text-zinc-100", borderClass: "border-zinc-900", ringClass: "ring-zinc-600" },
  { hex: "#1AF9F9", name: "Aqua",             bgClass: "bg-cyan-100",    textClass: "text-cyan-800", borderClass: "border-cyan-300", ringClass: "ring-cyan-400" },
  { hex: "#F4F4F5", name: "White",            bgClass: "bg-zinc-100",    textClass: "text-zinc-800", borderClass: "border-zinc-300", ringClass: "ring-zinc-400" },
  { hex: "#FFD700", name: "Gold",             bgClass: "bg-amber-100",   textClass: "text-amber-800", borderClass: "border-amber-300", ringClass: "ring-amber-400" },
  { hex: "#06B6D4", name: "Cyan / Neon Blue", bgClass: "bg-cyan-100",    textClass: "text-cyan-800", borderClass: "border-cyan-300", ringClass: "ring-cyan-400" },
  { hex: "#EC4899", name: "Neon Pink",         bgClass: "bg-pink-100",    textClass: "text-pink-800", borderClass: "border-pink-300", ringClass: "ring-pink-400" },
  { hex: "#14B8A6", name: "Mint Teal",         bgClass: "bg-teal-100",    textClass: "text-teal-800", borderClass: "border-teal-300", ringClass: "ring-teal-400" },
  { hex: "#84CC16", name: "Lime Green",        bgClass: "bg-lime-100",    textClass: "text-lime-800", borderClass: "border-lime-300", ringClass: "ring-lime-400" },
  { hex: "#6366F1", name: "Indigo Night",      bgClass: "bg-indigo-100",  textClass: "text-indigo-800", borderClass: "border-indigo-300", ringClass: "ring-indigo-400" },
  { hex: "#64748B", name: "Slate Silver",      bgClass: "bg-slate-100",   textClass: "text-slate-800", borderClass: "border-slate-300", ringClass: "ring-slate-400" },
];

/**
 * Fallback mapping if a slot does not have a color in database yet
 */
const DEFAULT_SLOT_COLORS = {
  "11AM-12PM": "#FFF0B3", // Yellow
  "12PM-1PM":  "#10B981", // Green
  "1PM-2PM":   "#EF4444", // Red
  "2PM-3PM":   "#3B82F6", // Blue
  "3PM-4PM":   "#F97316", // Orange
  "4PM-5PM":   "#8B5CF6", // Purple
  "5PM-6PM":   "#18181B", // Black
  "6PM-7PM":   "#1AF9F9", // Aqua
  "7PM-8PM":   "#F4F4F5", // White
  "8PM-9PM":   "#FFD700", // Gold
  "9PM-10PM":  "#06B6D4", // Cyan
  "10PM-11PM": "#EC4899", // Pink
  "11PM-12AM": "#64748B", // Slate
};

/**
 * Common color name keywords to Hex codes mapping
 */
const COLOR_NAME_TO_HEX = {
  "yellow": "#FFF0B3",
  "green": "#10B981",
  "emerald": "#10B981",
  "red": "#EF4444",
  "ruby": "#EF4444",
  "blue": "#3B82F6",
  "royal blue": "#3B82F6",
  "orange": "#F97316",
  "purple": "#8B5CF6",
  "black": "#18181B",
  "aqua": "#1AF9F9",
  "cyan": "#06B6D4",
  "white": "#F4F4F5",
  "gold": "#FFD700",
  "golden": "#FFD700",
  "amber": "#F59E0B",
  "pink": "#EC4899",
  "teal": "#14B8A6",
  "lime": "#84CC16",
  "indigo": "#6366F1",
  "slate": "#64748B",
  "silver": "#94A3B8",
};

function resolveColorNameToHex(name) {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  
  // Exact match
  if (COLOR_NAME_TO_HEX[clean]) return COLOR_NAME_TO_HEX[clean];

  // Keyword check
  for (const [key, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(clean)) {
      return hex;
    }
  }

  return null;
}

function getSlotWristbandColor(slotLabel, customHex, customColorName) {
  let targetHex = (customHex && typeof customHex === 'string') ? customHex.trim() : null;
  if (!targetHex && customColorName) {
    const resolved = resolveColorNameToHex(customColorName);
    if (resolved) targetHex = resolved;
  }

  // Only use custom hex/name if provided by admin. Never auto-force default colors onto slots.
  const hex = (targetHex || "#06B6D4").toUpperCase();
  
  const found = WRISTBAND_PALETTE.find(p => p.hex.toUpperCase() === hex);
  if (found) {
    return {
      ...found,
      name: (customColorName && customColorName.trim()) ? customColorName.trim() : found.name
    };
  }

  return {
    hex,
    name: (customColorName && customColorName.trim()) ? customColorName.trim() : "Custom Band",
    bgClass: "bg-gray-100",
    textClass: "text-gray-800",
    borderClass: "border-gray-300",
    ringClass: "ring-gray-400"
  };
}

/**
 * Computes high-contrast badge styles (perceived luminance calculation)
 */
function getWristbandBadgeStyle(hex) {
  if (!hex) {
    return {
      backgroundColor: "rgba(255,255,255,0.06)",
      borderColor: "rgba(255,255,255,0.15)",
      color: "#ffffff",
      dotBorderColor: "rgba(0, 0, 0, 0.2)"
    };
  }
  const cleanHex = hex.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  // Calculate perceived luminance (standard formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.72) {
    return {
      backgroundColor: "#F4F4F5",
      borderColor: "#D4D4D8",
      color: "#18181B", // Dark charcoal for high contrast readability
      dotBorderColor: "#71717A"
    };
  }

  return {
    backgroundColor: `${hex}18`,
    borderColor: `${hex}50`,
    color: hex,
    dotBorderColor: "rgba(0, 0, 0, 0.2)"
  };
}

// Universal module export (Node.js CommonJS & Browser Window)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WRISTBAND_PALETTE,
    DEFAULT_SLOT_COLORS,
    COLOR_NAME_TO_HEX,
    resolveColorNameToHex,
    getSlotWristbandColor,
    getWristbandBadgeStyle
  };
}

if (typeof window !== 'undefined') {
  window.WRISTBAND_PALETTE = WRISTBAND_PALETTE;
  window.DEFAULT_SLOT_COLORS = DEFAULT_SLOT_COLORS;
  window.COLOR_NAME_TO_HEX = COLOR_NAME_TO_HEX;
  window.resolveColorNameToHex = resolveColorNameToHex;
  window.getSlotWristbandColor = getSlotWristbandColor;
  window.getWristbandBadgeStyle = getWristbandBadgeStyle;
}
