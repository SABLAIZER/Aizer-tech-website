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

export type MessageStatus = 'new' | 'reviewed' | 'replied' | 'done' | 'archived';

export type MessageCollection = 'aizertech_messages' | 'contactMessages';

export interface ContactMessageRecord {
  id: string;
  sourceCollection: MessageCollection;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  serviceType: string;
  budgetTier: string;
  message: string;
  status: MessageStatus;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type StudioProjectStatus = 'in_progress' | 'done';

export interface StudioProjectRecord {
  id: string;
  title: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  amountGhs: number;
  status: StudioProjectStatus;
  notes: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export interface CmsServiceItem {
  id: string;
  name: string;
  description: string;
  startingPrice: string;
  deliveryTime: string;
  visible: boolean;
  deliverables: string[];
  featured?: boolean;
}

export interface CmsPortfolioProject {
  id: string;
  title: string;
  category: string;
  price: string;
  description: string;
  imageUrl: string;
  clientName: string;
  location: string;
}

export interface CmsHeroContact {
  heroTitle: string;
  heroSubtitle: string;
  announcementBanner: string;
  whatsappNumber: string;
  email: string;
  location: string;
  aboutText: string;
  whyUsPoints: string[];
}

export interface WebsiteCmsData {
  hero: CmsHeroContact;
  services: CmsServiceItem[];
  projects: CmsPortfolioProject[];
  updatedAt?: { seconds: number; nanoseconds: number } | null;
  publishedAt?: { seconds: number; nanoseconds: number } | null;
}

export interface WebsiteBackupRecord {
  id: string;
  label: string;
  snapshot: WebsiteCmsData;
  backedUpAt?: { seconds: number; nanoseconds: number } | null;
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
export const ALLOWED_ADMIN_EMAILS = [
  'sablahevans0@gmail.com',
  'sablaizer@gmail.com',
] as const;

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (ALLOWED_ADMIN_EMAILS as readonly string[]).includes(normalized);
}

export function normalizeWhatsAppDigits(raw?: string): string {
  const digits = (raw || WHATSAPP_NUMBER).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return `233${digits.slice(1)}`;
  }
  return digits || WHATSAPP_NUMBER;
}

export function formatWhatsAppDisplay(raw?: string): string {
  const digits = normalizeWhatsAppDigits(raw);
  if (digits.startsWith('233') && digits.length === 12) {
    return `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return digits ? `+${digits}` : WHATSAPP_DISPLAY;
}

export function buildWhatsAppUrl(
  customMessage?: string,
  phoneOverride?: string
): string {
  const defaultMsg =
    'Hello Aizer Tech, I would like to discuss a website or mobile app project.';
  const text = encodeURIComponent(customMessage || defaultMsg);
  const digits = normalizeWhatsAppDigits(phoneOverride);
  return `https://wa.me/${digits}?text=${text}`;
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

export interface StudioSettings {
  heroHeadline: string;
  heroSubheadline: string;
  announcementBanner: string;
  websiteStartingPrice: string;
  mobileStartingPrice: string;
  brandingStartingPrice: string;
  whatsappNumber: string;
  contactEmail: string;
  founderBio: string;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  heroHeadline: 'Luxury digital products engineered for modern businesses.',
  heroSubheadline:
    'Aizer Tech crafts high-converting business websites starting from GHS 800 and bespoke iOS & Android mobile apps starting from GHS 2,500—built in Accra for discerning local and international brands.',
  announcementBanner: '',
  websiteStartingPrice: 'From GHS 800',
  mobileStartingPrice: 'From GHS 2,500',
  brandingStartingPrice: 'Project Based',
  whatsappNumber: WHATSAPP_NUMBER,
  contactEmail: ADMIN_EMAIL,
  founderBio:
    'Aizer Tech was built in Accra on a straightforward principle: local businesses and emerging brands deserve international-grade websites and mobile software without inflated agency retainers.',
};

export const DEFAULT_CMS_SERVICES: CmsServiceItem[] = [
  {
    id: 'app-development',
    name: 'App Development',
    description:
      'Fluid, native-grade iOS & Android mobile applications engineered for everyday devices across Ghana, complete with MTN MoMo & Telecel Cash checkout.',
    startingPrice: 'From GHS 2,500',
    deliveryTime: '3 – 6 Weeks',
    visible: true,
    featured: true,
    deliverables: [
      'Unified iOS & Android application build',
      'Mobile Money (MTN MoMo, Telecel) & card readiness',
      'User accounts, push notifications & live sync',
      'Play Store & App Store launch preparation',
    ],
  },
  {
    id: 'website-development',
    name: 'Website Development',
    description:
      'Bespoke company websites, flagship landing pages, and digital storefronts built to establish immediate trust and convert Accra & global visitors into paying clients.',
    startingPrice: 'From GHS 800',
    deliveryTime: '7 Days',
    visible: true,
    featured: true,
    deliverables: [
      'Custom responsive design tailored to your brand',
      'WhatsApp instant quote & inquiry routing',
      'Search-ready structure, SSL security & fast loading',
      'Contact forms with saved client message database',
    ],
  },
  {
    id: 'logo-branding',
    name: 'Logo & Branding',
    description:
      'Memorable brand identities, bespoke gold-standard logos, color systems, and social launch kits that position your business as a category leader.',
    startingPrice: 'From GHS 500',
    deliveryTime: '3 – 5 Days',
    visible: true,
    deliverables: [
      'Primary & icon mark logo variations (SVG, PNG)',
      'Executive brand color palette & typography guide',
      'Social media profile & business card assets',
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description:
      'High-converting online stores and food/product ordering platforms with inventory management, Accra zone delivery pricing, and Mobile Money checkout.',
    startingPrice: 'From GHS 1,800',
    deliveryTime: '10 – 14 Days',
    visible: true,
    deliverables: [
      'Product catalog, cart & order status tracking',
      'MTN MoMo, Telecel Cash & card payment integration',
      'Owner order alerts & inventory controls',
    ],
  },
  {
    id: 'ui-ux-design',
    name: 'UI/UX Design',
    description:
      'Tactile iOS-inspired interface systems, interactive clickable prototypes, and conversion audits before full engineering begins.',
    startingPrice: 'From GHS 900',
    deliveryTime: '5 Days',
    visible: true,
    deliverables: [
      'High-fidelity Figma prototypes & component kits',
      'Mobile-first user flow optimization',
      'Developer-ready design handoff specs',
    ],
  },
];

export const DEFAULT_CMS_PROJECTS: CmsPortfolioProject[] = [
  {
    id: 'chopbox-accra',
    title: 'ChopBox Accra — Food Ordering & Delivery App',
    category: 'App',
    price: 'GHS 3,500',
    description:
      'Full-stack food ordering and dispatch ecosystem built for multi-branch restaurants in Accra, replacing marketplace commissions with direct Mobile Money checkout and live rider tracking.',
    imageUrl: '',
    clientName: 'ChopBox Kitchen',
    location: 'Osu & East Legon, Accra',
  },
  {
    id: 'osu-ridge',
    title: 'Osu Ridge Advisory Portal',
    category: 'Website',
    price: 'GHS 1,200',
    description:
      'High-contrast architectural web presence for an Accra commercial real estate and legal advisory firm, featuring instant consultation booking and WhatsApp routing.',
    imageUrl: '',
    clientName: 'Osu Ridge Advisory',
    location: 'Accra, Ghana',
  },
  {
    id: 'kentepay-merchant',
    title: 'KentePay Merchant Companion',
    category: 'App',
    price: 'GHS 4,200',
    description:
      'Inventory and daily reconciliation companion app enabling boutique retailers to issue digital WhatsApp receipts and track Mobile Money collections across branches.',
    imageUrl: '',
    clientName: 'KentePay Retail Group',
    location: 'Accra & Kumasi',
  },
];

export const DEFAULT_WEBSITE_CMS: WebsiteCmsData = {
  hero: {
    heroTitle: DEFAULT_STUDIO_SETTINGS.heroHeadline,
    heroSubtitle: DEFAULT_STUDIO_SETTINGS.heroSubheadline,
    announcementBanner: '',
    whatsappNumber: WHATSAPP_NUMBER,
    email: ADMIN_EMAIL,
    location: 'Accra, Ghana',
    aboutText: DEFAULT_STUDIO_SETTINGS.founderBio,
    whyUsPoints: [
      'Direct founder engineering by Sablaizer — no agency middlemen or inflated retainers.',
      'Built specifically for Ghanaian & international networks with MTN MoMo & Telecel Cash readiness.',
      'Fast 5–10 day website delivery and transparent fixed GHS milestone pricing.',
    ],
  },
  services: DEFAULT_CMS_SERVICES,
  projects: DEFAULT_CMS_PROJECTS,
  updatedAt: null,
  publishedAt: null,
};

export function normalizeWebsiteCms(raw: unknown): WebsiteCmsData {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawHero = (
    data.hero && typeof data.hero === 'object' ? data.hero : {}
  ) as Record<string, unknown>;

  const hero: CmsHeroContact = {
    heroTitle:
      typeof rawHero.heroTitle === 'string' && rawHero.heroTitle.trim()
        ? rawHero.heroTitle
        : DEFAULT_WEBSITE_CMS.hero.heroTitle,
    heroSubtitle:
      typeof rawHero.heroSubtitle === 'string' && rawHero.heroSubtitle.trim()
        ? rawHero.heroSubtitle
        : DEFAULT_WEBSITE_CMS.hero.heroSubtitle,
    announcementBanner:
      typeof rawHero.announcementBanner === 'string'
        ? rawHero.announcementBanner
        : '',
    whatsappNumber:
      typeof rawHero.whatsappNumber === 'string' && rawHero.whatsappNumber.trim()
        ? rawHero.whatsappNumber
        : DEFAULT_WEBSITE_CMS.hero.whatsappNumber,
    email:
      typeof rawHero.email === 'string' && rawHero.email.trim()
        ? rawHero.email
        : DEFAULT_WEBSITE_CMS.hero.email,
    location:
      typeof rawHero.location === 'string' && rawHero.location.trim()
        ? rawHero.location
        : DEFAULT_WEBSITE_CMS.hero.location,
    aboutText:
      typeof rawHero.aboutText === 'string' && rawHero.aboutText.trim()
        ? rawHero.aboutText
        : DEFAULT_WEBSITE_CMS.hero.aboutText,
    whyUsPoints: Array.isArray(rawHero.whyUsPoints)
      ? rawHero.whyUsPoints.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0
        )
      : DEFAULT_WEBSITE_CMS.hero.whyUsPoints,
  };

  const services: CmsServiceItem[] = Array.isArray(data.services)
    ? data.services
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item, idx) => ({
          id: typeof item.id === 'string' && item.id ? item.id : `service-${idx + 1}`,
          name: typeof item.name === 'string' ? item.name : 'Service',
          description: typeof item.description === 'string' ? item.description : '',
          startingPrice:
            typeof item.startingPrice === 'string' ? item.startingPrice : 'Project Based',
          deliveryTime:
            typeof item.deliveryTime === 'string' ? item.deliveryTime : '7 Days',
          visible: typeof item.visible === 'boolean' ? item.visible : true,
          featured: Boolean(item.featured),
          deliverables: Array.isArray(item.deliverables)
            ? item.deliverables.filter((d): d is string => typeof d === 'string')
            : [],
        }))
    : DEFAULT_CMS_SERVICES;

  const projects: CmsPortfolioProject[] = Array.isArray(data.projects)
    ? data.projects
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item, idx) => ({
          id: typeof item.id === 'string' && item.id ? item.id : `project-${idx + 1}`,
          title: typeof item.title === 'string' ? item.title : 'Client Project',
          category: typeof item.category === 'string' ? item.category : 'Website',
          price: typeof item.price === 'string' ? item.price : 'Project Based',
          description: typeof item.description === 'string' ? item.description : '',
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
          clientName: typeof item.clientName === 'string' ? item.clientName : '',
          location:
            typeof item.location === 'string' && item.location
              ? item.location
              : 'Accra, Ghana',
        }))
    : DEFAULT_CMS_PROJECTS;

  return {
    hero,
    services,
    projects,
    updatedAt: (data.updatedAt as WebsiteCmsData['updatedAt']) || null,
    publishedAt: (data.publishedAt as WebsiteCmsData['publishedAt']) || null,
  };
}

export const STUDIO_SETTINGS_LIMITS = {
  MIN_HERO_HEADLINE: 10,
  MAX_HERO_HEADLINE: 140,
  MIN_HERO_SUBHEADLINE: 10,
  MAX_HERO_SUBHEADLINE: 350,
  MAX_ANNOUNCEMENT: 160,
  MIN_PRICE_LABEL: 2,
  MAX_PRICE_LABEL: 40,
  MIN_PHONE_LEN: 7,
  MAX_PHONE_LEN: 20,
  MIN_EMAIL_LEN: 5,
  MAX_EMAIL_LEN: 150,
  MIN_FOUNDER_BIO: 20,
  MAX_FOUNDER_BIO: 600,
} as const;

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
