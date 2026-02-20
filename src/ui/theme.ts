// src/ui/theme.ts

// ========================
// 🎨 COLORS
// ========================

export const Colors = {
  // Backgrounds
  bg: '#f8fafc',
  card: '#ffffff',
  docBg: '#f1f5f9',

  // Text
  text: '#0f172a',
  muted: '#64748b',
  placeholder: '#cbd5e1',

  // Borders
  border: '#e2e8f0',

  // Primary (TON BLEU ACTUEL)
  primary: '#3b82f6',
  primary2: '#2563eb',
  primary3: '#1e40af',

  // Status
  danger: '#ef4444',

  // Extras
  softBlueBg: '#eff6ff',
  emptyGray: '#cbd5e1',
} as const;


// ========================
// 🌈 GRADIENTS
// ========================

export const Gradients = {
  header: ['#3b82f6', '#2563eb', '#1e40af'],
  action: ['#3b82f6', '#2563eb'],
} as const;


// ========================
// 🔵 RADIUS
// ========================

export const Radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,

  header: 24,
  docHeader: 28,
} as const;


// ========================
// 📏 SPACING
// ========================

export const Spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;


// ========================
// 🌑 SHADOWS
// ========================

export const Shadow = {
  card: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  docHeader: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  docCard: {
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  listCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;


// ========================
// 🔥 ICONS (Feather names)
// ========================

export const Icons = {
  // Navigation
  back: 'arrow-left',
  chevronRight: 'chevron-right',

  // Work order
  wo: 'clipboard',
  site: 'map-pin',

  // Documents
  upload: 'upload',
  fileText: 'file-text',
  folder: 'folder',

  // Material / Labor
  users: 'users',
  package: 'package',
  user: 'user',

  // Status
  check: 'check',
  checkCircle: 'check-circle',
  info: 'info',
  inbox: 'inbox',
  clock: 'clock',

  // Form
  hash: 'hash',
  maximize: 'maximize',
} as const;