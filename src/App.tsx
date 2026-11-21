import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { AdminInboxModal } from './components/AdminInboxModal';
import { ClientSuccessSection } from './components/ClientSuccessSection';
import { ContactSection } from './components/ContactSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FoodAppShowcase } from './components/FoodAppShowcase';
import { Footer } from './components/Footer';
import { FounderSection } from './components/FounderSection';
import { Hero } from './components/Hero';
import { Navbar } from './components/Navbar';
import { ProcessSection } from './components/ProcessSection';
import { ServicesSection } from './components/ServicesSection';
import {
  BudgetTier,
  buildWhatsAppUrl,
  ServiceType,
  ThemeMode,
} from './types';

const THEME_STORAGE_KEY = 'aizer-theme';

function getInitialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'obsidian' || saved === 'midnight-gold' || saved === 'light-glass') {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  return 'obsidian';
}

function isAdminUrlRequested(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');
    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    return (
      hash === '#aizertechgh-admin' ||
      hash === '#admin' ||
      pathname === '/aizertechgh-admin' ||
      pathname === '/admin' ||
      params.has('admin') ||
      params.has('aizertechgh-admin')
    );
  } catch {
    return false;
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [selectedService, setSelectedService] = useState<ServiceType>(
    'Business Website (from GHS 800)'
  );
  const [selectedBudget, setSelectedBudget] = useState<BudgetTier>('GHS 800 - 1,500');
  const [inboxOpen, setInboxOpen] = useState<boolean>(isAdminUrlRequested);

  useEffect(() => {
    const handleHashChange = () => {
      if (isAdminUrlRequested()) {
        setInboxOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme !== 'light-glass');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectService = (service: ServiceType, budget: BudgetTier) => {
    setSelectedService(service);
    setSelectedBudget(budget);
    scrollToSection('contact');
  };

  const handleBuildFoodApp = () => {
    setSelectedService('Food App / Custom Platform');
    setSelectedBudget('GHS 2,500 - 5,000');
    scrollToSection('contact');
  };

  const handleCloseInbox = () => {
    setInboxOpen(false);
    try {
      if (isAdminUrlRequested()) {
        const lowerPath = window.location.pathname.toLowerCase();
        const cleanUrl =
          lowerPath === '/admin' || lowerPath === '/aizertechgh-admin'
            ? '/'
            : window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }
    } catch {
      // Ignore history errors
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <div className="min-h-screen bg-canvas text-ink transition-colors duration-200">
          <Navbar onNavigateContact={() => scrollToSection('contact')} />

          <main>
            <Hero
              onStartProject={() => scrollToSection('contact')}
              onExplorePortfolio={() => scrollToSection('portfolio')}
            />

            <ServicesSection onSelectService={handleSelectService} />

            <FoodAppShowcase onBuildSimilarFoodApp={handleBuildFoodApp} />

            <ProcessSection />

            <FounderSection />

            <ClientSuccessSection />

            <ContactSection
              selectedService={selectedService}
              selectedBudget={selectedBudget}
              onChangeService={setSelectedService}
              onChangeBudget={setSelectedBudget}
            />
          </main>

          <Footer theme={theme} onChangeTheme={setTheme} />

          {/* Compact Floating iOS Glass WhatsApp Quick Action (<= 48px height to respect mobile sticky budget) */}
          <a
            href={buildWhatsAppUrl(
              'Hello Aizer Tech, I saw your portfolio and would like to start a project.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with Aizer Tech on WhatsApp"
            className="haptic-tap fixed bottom-5 right-5 z-30 h-11 px-4 rounded-full bg-[#25D366]/90 backdrop-blur-xl border border-white/25 text-[#070708] text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_32px_-8px_rgba(37,211,102,0.45)] hover:bg-[#2EE372] inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          <AdminInboxModal open={inboxOpen} onClose={handleCloseInbox} />
        </div>
      </ErrorBoundary>
    </MotionConfig>
  );
}
