import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { AdminInboxModal } from './components/AdminInboxModal';
import { BookCallSection } from './components/BookCallSection';
import { ClientPortalPage } from './components/ClientPortalPage';
import { ClientSuccessSection } from './components/ClientSuccessSection';
import { ContactSection } from './components/ContactSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FoodAppShowcase } from './components/FoodAppShowcase';
import { Footer } from './components/Footer';
import { FounderSection } from './components/FounderSection';
import { Hero } from './components/Hero';
import {
  FirstLoginPhoneModal,
  LoginGateModal,
} from './components/LoginGateModal';
import { Navbar } from './components/Navbar';
import { ProcessSection } from './components/ProcessSection';
import { ServicesSection } from './components/ServicesSection';
import { auth, db, googleSignInBasic, signOutAdmin } from './firebase';
import {
  BudgetTier,
  DEFAULT_STUDIO_SETTINGS,
  DEFAULT_WEBSITE_CMS,
  isAllowedAdminEmail,
  LoginGateReason,
  normalizeWebsiteCms,
  RegisteredUserRecord,
  ServiceType,
  StudioSettings,
  TestimonialRecord,
  ThemeMode,
  WebsiteCmsData,
} from './types';
import {
  saveUserPhoneAndMarkPrompted,
  trackUniqueDailyVisit,
  upsertRegisteredUserProfile,
} from './utils/visitorTracker';

const THEME_STORAGE_KEY = 'aizer-theme';
const LIVE_CMS_CACHE_KEY = 'aizer_live_website_cache_v3';

function getInitialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (
      saved === 'obsidian' ||
      saved === 'midnight-gold' ||
      saved === 'light-glass'
    ) {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  return 'obsidian';
}

function getCachedLiveCms(): { cms: WebsiteCmsData; hasCache: boolean } {
  try {
    const raw = window.localStorage.getItem(LIVE_CMS_CACHE_KEY);
    if (raw) {
      return { cms: normalizeWebsiteCms(JSON.parse(raw)), hasCache: true };
    }
  } catch {
    // Ignore parse/storage errors
  }
  return { cms: DEFAULT_WEBSITE_CMS, hasCache: false };
}

function saveCachedLiveCms(cms: WebsiteCmsData): void {
  try {
    window.localStorage.setItem(LIVE_CMS_CACHE_KEY, JSON.stringify(cms));
  } catch {
    // Ignore storage quota errors
  }
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

function isMyAccountUrlRequested(): boolean {
  try {
    const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');
    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    return pathname === '/my-account' || hash === '#my-account';
  } catch {
    return false;
  }
}

export default function App() {
  const initialCache = getCachedLiveCms();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [selectedService, setSelectedService] = useState<ServiceType>(
    'Business Website (from GHS 600)'
  );
  const [selectedBudget, setSelectedBudget] =
    useState<BudgetTier>('GHS 600 - 1,500');
  const [inboxOpen, setInboxOpen] = useState<boolean>(isAdminUrlRequested);
  const [portalOpen, setPortalOpen] = useState<boolean>(false);
  const [portalInitialTab, setPortalInitialTab] = useState<
    'chat' | 'requests' | 'invoices'
  >('chat');

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] =
    useState<RegisteredUserRecord | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginReason, setLoginReason] = useState<LoginGateReason>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [phonePromptOpen, setPhonePromptOpen] = useState<boolean>(false);

  const pendingActionRef = useRef<(() => void) | null>(null);
  const visitTrackedRef = useRef<boolean>(false);

  const [liveCms, setLiveCms] = useState<WebsiteCmsData>(initialCache.cms);
  const [cmsLoading, setCmsLoading] = useState<boolean>(!initialCache.hasCache);
  const [hasLiveDoc, setHasLiveDoc] = useState<boolean>(false);

  const [studioSettings, setStudioSettings] = useState<StudioSettings>(
    DEFAULT_STUDIO_SETTINGS
  );
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState<boolean>(true);

  const openMyAccount = (tab: 'chat' | 'requests' | 'invoices' = 'chat') => {
    setPortalInitialTab(tab);
    setPortalOpen(true);
    try {
      if (window.location.pathname !== '/my-account') {
        window.history.pushState(null, '', '/my-account');
      }
    } catch {
      // Ignore history errors
    }
  };

  const closeMyAccount = () => {
    setPortalOpen(false);
    try {
      const lowerPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (lowerPath === '/my-account' || window.location.hash.toLowerCase() === '#my-account') {
        window.history.replaceState(null, '', '/');
      }
    } catch {
      // Ignore history errors
    }
  };

  // Route synchronization for /admin and /my-account
  useEffect(() => {
    const syncRoutes = () => {
      const adminRequested = isAdminUrlRequested();
      setInboxOpen(adminRequested);

      if (!adminRequested && isMyAccountUrlRequested()) {
        if (authUser && authUser.emailVerified) {
          setPortalOpen(true);
        } else if (authReady) {
          setPortalOpen(false);
          setLoginReason('my-account');
          pendingActionRef.current = () => openMyAccount('chat');
          setLoginModalOpen(true);
        }
      } else if (!isMyAccountUrlRequested()) {
        setPortalOpen(false);
      }
    };

    window.addEventListener('hashchange', syncRoutes);
    window.addEventListener('popstate', syncRoutes);
    return () => {
      window.removeEventListener('hashchange', syncRoutes);
      window.removeEventListener('popstate', syncRoutes);
    };
  }, [authUser, authReady]);

  // Firebase Auth listener + Registered User profile sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser && firebaseUser.emailVerified) {
        upsertRegisteredUserProfile(firebaseUser)
          .then(({ needsPhonePrompt }) => {
            if (
              needsPhonePrompt &&
              !isAdminUrlRequested() &&
              !isAllowedAdminEmail(firebaseUser.email)
            ) {
              setPhonePromptOpen(true);
            }
          })
          .catch(() => {});

        if (isMyAccountUrlRequested() && !isAdminUrlRequested()) {
          setPortalOpen(true);
        }
      } else {
        setUserProfile(null);
        setPhonePromptOpen(false);
        setPortalOpen(false);
        if (isMyAccountUrlRequested() && !isAdminUrlRequested()) {
          setLoginReason('my-account');
          pendingActionRef.current = () => openMyAccount('chat');
          setLoginModalOpen(true);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // Subscribe to current logged-in user's aizertech_users document
  useEffect(() => {
    if (!authUser || !authUser.emailVerified) {
      setUserProfile(null);
      return;
    }

    const unsubProfile = onSnapshot(
      doc(db, 'aizertech_users', authUser.uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setUserProfile({
          uid: String(d.uid || authUser.uid),
          name: String(d.name || authUser.displayName || 'Client'),
          email: String(d.email || authUser.email || ''),
          photoUrl: String(d.photoUrl || authUser.photoURL || ''),
          phone: String(d.phone || ''),
          phonePrompted: Boolean(d.phonePrompted),
          firstLoginAt: d.firstLoginAt || null,
          lastActiveAt: d.lastActiveAt || null,
          totalRequests: Number(d.totalRequests) || 0,
        });
      },
      () => {}
    );

    return () => unsubProfile();
  }, [authUser]);

  // Real-time unique daily visitor tracking (excludes admins & /admin route)
  useEffect(() => {
    if (!authReady || visitTrackedRef.current) return;
    visitTrackedRef.current = true;
    void trackUniqueDailyVisit({
      isAdmin: isAllowedAdminEmail(authUser?.email),
      isAdminRoute: isAdminUrlRequested(),
    });
  }, [authReady, authUser]);

  // Primary real-time subscription to aizertech_live/website
  useEffect(() => {
    const liveRef = doc(db, 'aizertech_live', 'website');
    const unsubscribe = onSnapshot(
      liveRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const normalized = normalizeWebsiteCms(snapshot.data());
          setHasLiveDoc(true);
          setLiveCms(normalized);
          saveCachedLiveCms(normalized);
        } else {
          setHasLiveDoc(false);
        }
        setCmsLoading(false);
      },
      (error) => {
        const reason =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: unknown }).code)
            : 'unavailable';
        console.warn(`Live website subscription paused (${reason}); using cached/default content.`);
        setCmsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [authReady, authUser?.uid]);

  // Legacy studioSettings/public sync
  useEffect(() => {
    const settingsRef = doc(db, 'studioSettings', 'public');
    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStudioSettings(DEFAULT_STUDIO_SETTINGS);
          return;
        }
        const data = snapshot.data();
        const nextSettings: StudioSettings = {
          heroHeadline:
            typeof data.heroHeadline === 'string' && data.heroHeadline.trim()
              ? data.heroHeadline
              : DEFAULT_STUDIO_SETTINGS.heroHeadline,
          heroSubheadline:
            typeof data.heroSubheadline === 'string' && data.heroSubheadline.trim()
              ? data.heroSubheadline
              : DEFAULT_STUDIO_SETTINGS.heroSubheadline,
          announcementBanner:
            typeof data.announcementBanner === 'string'
              ? data.announcementBanner
              : DEFAULT_STUDIO_SETTINGS.announcementBanner,
          websiteStartingPrice:
            typeof data.websiteStartingPrice === 'string' &&
            data.websiteStartingPrice.trim()
              ? data.websiteStartingPrice
              : DEFAULT_STUDIO_SETTINGS.websiteStartingPrice,
          mobileStartingPrice:
            typeof data.mobileStartingPrice === 'string' &&
            data.mobileStartingPrice.trim()
              ? data.mobileStartingPrice
              : DEFAULT_STUDIO_SETTINGS.mobileStartingPrice,
          brandingStartingPrice:
            typeof data.brandingStartingPrice === 'string' &&
            data.brandingStartingPrice.trim()
              ? data.brandingStartingPrice
              : DEFAULT_STUDIO_SETTINGS.brandingStartingPrice,
          whatsappNumber:
            typeof data.whatsappNumber === 'string' &&
            data.whatsappNumber.trim()
              ? data.whatsappNumber
              : DEFAULT_STUDIO_SETTINGS.whatsappNumber,
          contactEmail:
            typeof data.contactEmail === 'string' && data.contactEmail.trim()
              ? data.contactEmail
              : DEFAULT_STUDIO_SETTINGS.contactEmail,
          founderBio:
            typeof data.founderBio === 'string' && data.founderBio.trim()
              ? data.founderBio
              : DEFAULT_STUDIO_SETTINGS.founderBio,
          momoNumber:
            typeof data.momoNumber === 'string' && data.momoNumber.trim()
              ? data.momoNumber
              : DEFAULT_STUDIO_SETTINGS.momoNumber,
          momoName:
            typeof data.momoName === 'string' && data.momoName.trim()
              ? data.momoName
              : DEFAULT_STUDIO_SETTINGS.momoName,
          autoReplyMessage:
            typeof data.autoReplyMessage === 'string' &&
            data.autoReplyMessage.trim()
              ? data.autoReplyMessage
              : DEFAULT_STUDIO_SETTINGS.autoReplyMessage,
          workingHours:
            typeof data.workingHours === 'string' && data.workingHours.trim()
              ? data.workingHours
              : DEFAULT_STUDIO_SETTINGS.workingHours,
          updatedAt: data.updatedAt || null,
        };
        setStudioSettings(nextSettings);

        if (!hasLiveDoc) {
          setLiveCms((prev) => ({
            ...prev,
            hero: {
              ...prev.hero,
              heroTitle: nextSettings.heroHeadline,
              heroSubtitle: nextSettings.heroSubheadline,
              announcementBanner: nextSettings.announcementBanner,
              whatsappNumber: nextSettings.whatsappNumber,
              email: nextSettings.contactEmail,
              aboutText: nextSettings.founderBio,
            },
          }));
        }
      },
      (error) => {
        const reason =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: unknown }).code)
            : 'unavailable';
        console.warn(`Studio settings subscription paused (${reason}); using default settings.`);
        setStudioSettings(DEFAULT_STUDIO_SETTINGS);
      }
    );
    return () => unsubscribe();
  }, [hasLiveDoc, authReady, authUser?.uid]);

  // Real-time approved public testimonials
  useEffect(() => {
    const testimonialsQuery = query(
      collection(db, 'aizertech_testimonials'),
      where('approved', '==', true)
    );
    const unsubscribe = onSnapshot(
      testimonialsQuery,
      (snapshot) => {
        const rows: TestimonialRecord[] = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              clientName: String(d.clientName || 'Client'),
              service: String(d.service || 'Digital Product'),
              rating: Number(d.rating) || 5,
              message: String(d.message || ''),
              photoUrl: String(d.photoUrl || ''),
              approved: Boolean(d.approved),
              createdAt: d.createdAt || null,
              updatedAt: d.updatedAt || null,
            };
          })
          .sort(
            (a, b) =>
              (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
          );
        setTestimonials(rows);
        setTestimonialsLoading(false);
      },
      (error) => {
        const reason =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: unknown }).code)
            : 'unavailable';
        console.warn(`Testimonials subscription paused (${reason}); hiding unauthenticated reviews.`);
        setTestimonials([]);
        setTestimonialsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [authReady, authUser?.uid]);

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

  const requireAuthThen = (reason: LoginGateReason, action: () => void) => {
    if (authUser && authUser.emailVerified) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setLoginReason(reason);
    setLoginError(null);
    setLoginModalOpen(true);
  };

  const handleOpenLoginOnly = (reason: LoginGateReason = 'login') => {
    pendingActionRef.current = null;
    setLoginReason(reason);
    setLoginError(null);
    setLoginModalOpen(true);
  };

  const handleGooglePopupLogin = async () => {
    setLoginError(null);
    try {
      const signedUser = await googleSignInBasic(true);
      setAuthUser(signedUser);

      if (signedUser.emailVerified) {
        const { needsPhonePrompt } = await upsertRegisteredUserProfile(signedUser);
        if (needsPhonePrompt && !isAllowedAdminEmail(signedUser.email)) {
          setPhonePromptOpen(true);
        }
      }

      setLoginModalOpen(false);
      const nextAction = pendingActionRef.current;
      pendingActionRef.current = null;
      if (nextAction) {
        window.setTimeout(() => nextAction(), 60);
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Could not complete Google sign-in. Please allow pop-ups and try again.';
      if (msg.includes('auth/unauthorized-domain')) {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setLoginError(
          `Domain "${host}" is not authorized yet in Firebase Auth → Settings → Authorized domains.`
        );
      } else {
        setLoginError(msg);
      }
    }
  };

  const handleClientLogout = async () => {
    closeMyAccount();
    await signOutAdmin();
  };

  const handleGatedChat = () => {
    requireAuthThen('chat', () => openMyAccount('chat'));
  };

  const handleGatedQuote = (service?: ServiceType, budget?: BudgetTier) => {
    requireAuthThen('quote', () => {
      if (service) setSelectedService(service);
      if (budget) setSelectedBudget(budget);
      scrollToSection('contact');
    });
  };

  const isLoggedIn = Boolean(authUser && authUser.emailVerified);

  const handleBuildFoodApp = () => {
    handleGatedQuote('Food App / Custom Platform', 'GHS 1,500 - 2,500');
  };

  const handleRequestPortfolioProject = (project: {
    category?: string;
  }) => {
    const cat = (project.category || '').toLowerCase();
    if (cat.includes('app')) {
      handleGatedQuote('Mobile App (from GHS 1,500)', 'GHS 1,500 - 2,500');
      return;
    }
    if (cat.includes('e-commerce') || cat.includes('food')) {
      handleGatedQuote('Food App / Custom Platform', 'GHS 1,500 - 2,500');
      return;
    }
    handleGatedQuote('Business Website (from GHS 600)', 'GHS 600 - 1,500');
  };

  const handleSaveFirstLoginPhone = async (phone: string) => {
    if (!authUser) return;
    await saveUserPhoneAndMarkPrompted(authUser.uid, phone);
    setPhonePromptOpen(false);
  };

  const handleSkipFirstLoginPhone = async () => {
    if (!authUser) {
      setPhonePromptOpen(false);
      return;
    }
    await saveUserPhoneAndMarkPrompted(authUser.uid, '');
    setPhonePromptOpen(false);
  };

  const handleCloseInbox = () => {
    setInboxOpen(false);
    try {
      if (isAdminUrlRequested()) {
        const lowerPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
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
        {inboxOpen ? (
          <AdminInboxModal
            open={true}
            fullPage={true}
            liveCms={liveCms}
            studioSettings={studioSettings}
            onClose={handleCloseInbox}
          />
        ) : portalOpen && authUser && authUser.emailVerified ? (
          <ClientPortalPage
            user={authUser}
            userProfile={userProfile}
            cms={liveCms}
            studioSettings={studioSettings}
            initialTab={portalInitialTab}
            onBackToSite={closeMyAccount}
            onJumpToSection={(sectionId) => {
              closeMyAccount();
              window.setTimeout(() => scrollToSection(sectionId), 80);
            }}
            onSavePhone={async (phone) => {
              await saveUserPhoneAndMarkPrompted(authUser.uid, phone);
            }}
            onLogout={handleClientLogout}
          />
        ) : (
          <div className="min-h-screen bg-canvas text-ink transition-colors duration-200">
            <Navbar
              authUser={authUser}
              userProfile={userProfile}
              onNavigateContact={() => handleGatedQuote()}
              onOpenLogin={() => handleOpenLoginOnly('login')}
              onOpenMyAccount={() =>
                requireAuthThen('my-account', () => openMyAccount('chat'))
              }
              onLogout={handleClientLogout}
              onChatWithUs={handleGatedChat}
            />

            <main>
              <Hero
                cms={liveCms}
                loading={cmsLoading}
                isLoggedIn={isLoggedIn}
                onStartProject={() => handleGatedQuote()}
                onChatWithUs={handleGatedChat}
                onExplorePortfolio={() => scrollToSection('portfolio')}
              />

              <ServicesSection
                cms={liveCms}
                loading={cmsLoading}
                isLoggedIn={isLoggedIn}
                onSelectService={handleGatedQuote}
                onChatWithUs={handleGatedChat}
              />

              <FoodAppShowcase
                cms={liveCms}
                loading={cmsLoading}
                isLoggedIn={isLoggedIn}
                onBuildSimilarFoodApp={handleBuildFoodApp}
                onRequestPortfolioProject={handleRequestPortfolioProject}
              />

              <ProcessSection />

              <FounderSection
                cms={liveCms}
                loading={cmsLoading}
                isLoggedIn={isLoggedIn}
              />

              <ClientSuccessSection
                testimonials={testimonials}
                loading={testimonialsLoading}
                onStartProject={() => handleGatedQuote()}
              />

              <BookCallSection
                cms={liveCms}
                workingHours={studioSettings.workingHours}
                authUser={authUser}
                userProfile={userProfile}
                onRequireLogin={(reason) => handleOpenLoginOnly(reason)}
              />

              <ContactSection
                cms={liveCms}
                studioSettings={studioSettings}
                selectedService={selectedService}
                selectedBudget={selectedBudget}
                authUser={authUser}
                userProfile={userProfile}
                onChangeService={setSelectedService}
                onChangeBudget={setSelectedBudget}
                onRequireLogin={(reason) => handleOpenLoginOnly(reason)}
                onOpenMyAccount={(tab) => openMyAccount(tab || 'chat')}
              />
            </main>

            <Footer
              theme={theme}
              cms={liveCms}
              isLoggedIn={isLoggedIn}
              onChangeTheme={setTheme}
              onChatWithUs={handleGatedChat}
            />

            {/* Compact Floating iOS Glass Chat With Us Quick Action (Strictly Login-Gated) */}
            <button
              type="button"
              onClick={handleGatedChat}
              aria-label="Chat With Us"
              className="haptic-tap fixed bottom-5 right-5 z-30 h-11 px-4 rounded-full bg-[#25D366]/90 backdrop-blur-xl border border-white/25 text-[#070708] text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_32px_-8px_rgba(37,211,102,0.45)] hover:bg-[#2EE372] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat With Us</span>
            </button>
          </div>
        )}

        <LoginGateModal
          open={loginModalOpen}
          reason={loginReason}
          authError={loginError}
          onGoogleLogin={handleGooglePopupLogin}
          onClose={() => {
            setLoginModalOpen(false);
            pendingActionRef.current = null;
            closeMyAccount();
          }}
        />

        <FirstLoginPhoneModal
          open={phonePromptOpen && !inboxOpen}
          userName={
            userProfile?.name ||
            authUser?.displayName?.split(' ')[0] ||
            'there'
          }
          onSavePhone={handleSaveFirstLoginPhone}
          onSkip={handleSkipFirstLoginPhone}
        />
      </ErrorBoundary>
    </MotionConfig>
  );
}
