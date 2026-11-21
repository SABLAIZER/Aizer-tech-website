export type ServiceType =
  | 'Business Website (from GHS 800)'
  | 'Mobile App (from GHS 2,500)'
  | 'Food App / Custom Platform'
  | 'Consulting & UI/UX';

export type BudgetTier =
  | 'GHS 800 - 1,500'
  | 'GHS 1,500 - 2,500'
  | 'GHS 2,500 - 5,000'
  | 'GHS 5,000+';

export type MessageStatus = 'new' | 'reviewed' | 'replied' | 'archived';

export interface ContactMessageRecord {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  serviceType: ServiceType;
  budgetTier: BudgetTier;
  message: string;
  status: MessageStatus;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export interface FoodDish {
  id: string;
  name: string;
  category: 'Jollof & Grill' | 'Local Bowls' | 'Drinks';
  priceGhs: number;
  prepTime: string;
  description: string;
  accentTone: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  tierLabel: string;
  location: string;
  summary: string;
  architecture: string[];
  outcomes: { label: string; value: string }[];
  stack: string[];
}

export type ThemeMode = 'obsidian' | 'midnight-gold' | 'light-glass';

export const THEME_OPTIONS: { id: ThemeMode; label: string; swatch: string }[] = [
  { id: 'obsidian', label: 'Deep Obsidian', swatch: '#070708' },
  { id: 'midnight-gold', label: 'Midnight Gold', swatch: '#0B1222' },
  { id: 'light-glass', label: 'Light Glass', swatch: '#EEF1F6' },
];

export const AIZER_LOGO_URL = '/src/assets/images/aizer_tech_logo_1795274765292.jpg';
export const FOUNDER_PORTRAIT_URL = '/assets/aistudio/IMG_1725_008ca0a8.jpeg';

export const WHATSAPP_NUMBER = '233276335736';
export const WHATSAPP_DISPLAY = '+233 27 633 5736';
export const ADMIN_EMAIL = 'sablahevans0@gmail.com';

export function buildWhatsAppUrl(customMessage?: string): string {
  const defaultMsg =
    'Hello Aizer Tech, I would like to discuss a website or mobile app project.';
  const text = encodeURIComponent(customMessage || defaultMsg);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export const SERVICE_OPTIONS: ServiceType[] = [
  'Business Website (from GHS 800)',
  'Mobile App (from GHS 2,500)',
  'Food App / Custom Platform',
  'Consulting & UI/UX',
];

export const BUDGET_OPTIONS: BudgetTier[] = [
  'GHS 800 - 1,500',
  'GHS 1,500 - 2,500',
  'GHS 2,500 - 5,000',
  'GHS 5,000+',
];

export const VALIDATION_LIMITS = {
  MIN_NAME_LEN: 2,
  MAX_NAME_LEN: 100,
  MIN_EMAIL_LEN: 5,
  MAX_EMAIL_LEN: 150,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MAX_PHONE_LEN: 30,
  MIN_MESSAGE_LEN: 10,
  MAX_MESSAGE_LEN: 2000,
} as const;
