import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MessageCircle,
  PhoneCall,
} from 'lucide-react';
import { db } from '../firebase';
import {
  buildWhatsAppUrl,
  LoginGateReason,
  RegisteredUserRecord,
  SERVICE_OPTIONS,
  VALIDATION_LIMITS,
  WebsiteCmsData,
} from '../types';
import { incrementUserTotalRequests } from '../utils/visitorTracker';
import { Reveal } from './Reveal';

interface BookCallSectionProps {
  cms: WebsiteCmsData;
  workingHours: string;
  authUser: User | null;
  userProfile: RegisteredUserRecord | null;
  onRequireLogin: (reason: LoginGateReason) => void;
}

const CALL_TIME_SLOTS = [
  '09:00 AM GMT',
  '10:30 AM GMT',
  '12:00 PM GMT',
  '02:00 PM GMT',
  '04:00 PM GMT',
  '05:30 PM GMT',
];

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const BookCallSection: React.FC<BookCallSectionProps> = ({
  cms,
  workingHours,
  authUser,
  userProfile,
  onRequireLogin,
}) => {
  const serviceOptions = useMemo(() => {
    const visibleCmsServices = cms.services
      .filter((svc) => svc.visible && svc.name.trim().length > 0)
      .map((svc) => svc.name.trim());
    return visibleCmsServices.length > 0
      ? visibleCmsServices
      : [
          'Business Website',
          'Mobile App',
          'Food App / Custom Platform',
          'Consulting & UI/UX',
        ];
  }, [cms.services]);

  const minDate = useMemo(() => getTodayIso(), []);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState(minDate);
  const [preferredTime, setPreferredTime] = useState(CALL_TIME_SLOTS[1]);
  const [service, setService] = useState(serviceOptions[0] || SERVICE_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookedSummary, setBookedSummary] = useState<{
    name: string;
    phone: string;
    date: string;
    time: string;
    service: string;
  } | null>(null);

  const isLoggedIn = Boolean(authUser && authUser.emailVerified);

  useEffect(() => {
    if (isLoggedIn) {
      const nextName = userProfile?.name || authUser?.displayName || '';
      const nextPhone = userProfile?.phone || '';
      setClientName((prev) => prev || nextName);
      setClientPhone((prev) => prev || nextPhone);
    }
  }, [isLoggedIn, userProfile?.name, userProfile?.phone, authUser?.displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!authUser || !authUser.emailVerified) {
      onRequireLogin('book-call');
      return;
    }

    const cleanName = clientName.trim();
    const cleanPhone = clientPhone.trim();

    if (cleanName.length < VALIDATION_LIMITS.MIN_NAME_LEN) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (cleanPhone.replace(/\D/g, '').length < 7) {
      setErrorMsg('Please enter a valid WhatsApp or phone number.');
      return;
    }
    if (!preferredDate || preferredDate.length < 6) {
      setErrorMsg('Please choose your preferred call date.');
      return;
    }

    const boundedName = cleanName.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN);
    const boundedPhone = cleanPhone.slice(0, VALIDATION_LIMITS.MAX_PHONE_LEN);
    const selectedService = (service || serviceOptions[0] || 'Consultation').slice(
      0,
      120
    );

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'aizertech_bookings'), {
        userId: authUser.uid,
        clientName: boundedName,
        clientPhone: boundedPhone,
        preferredDate: preferredDate.slice(0, 20),
        preferredTime: preferredTime.slice(0, 30),
        service: selectedService,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await incrementUserTotalRequests(authUser.uid);

      setBookedSummary({
        name: boundedName,
        phone: boundedPhone,
        date: preferredDate,
        time: preferredTime,
        service: selectedService,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Could not book call: ${err.message}`
          : 'Unable to book call right now. Please reach us via WhatsApp.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="book-call"
      aria-labelledby="book-call-heading"
      className="section-ambient py-16 sm:py-20 lg:py-28 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 min-w-0">
            <Reveal>
              <p className="text-sm text-accent font-medium mb-3">
                Free Strategy Call
              </p>
              <h2
                id="book-call-heading"
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-4"
              >
                Book a free 15-minute discovery call.
              </h2>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed mb-7">
                Pick a convenient day and time to speak directly with Sablaizer about your app, website, timeline, and exact GHS pricing—no obligation.
              </p>

              <div className="ios-glass-subtle rounded-[20px] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-muted font-medium">
                      Studio Working Hours
                    </p>
                    <p className="text-sm font-medium text-ink mt-1">
                      {workingHours}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-3 border-t border-hairline">
                  <PhoneCall className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-muted font-medium">
                      Call Format
                    </p>
                    <p className="text-sm text-ink-secondary mt-1">
                      WhatsApp Voice/Video or Direct Phone Call from Accra
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7 min-w-0">
            <Reveal delay={0.05}>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="ios-glass rounded-[24px] p-5 sm:p-8 space-y-5"
              >
                {!isLoggedIn && (
                  <div className="rounded-2xl ios-glass-gold p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-ink">
                      <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <p>
                        <strong className="text-accent">Google Login Required:</strong> Sign in once to book a free discovery call and track your call confirmation inside My Account.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequireLogin('book-call')}
                      className="haptic-tap-sm px-4 py-2 rounded-xl bg-accent-btn text-accent-ink text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Continue with Google
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="book-call-name"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Your Name
                    </label>
                    <input
                      id="book-call-name"
                      type="text"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ama Serwaa"
                      className="w-full px-4 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="book-call-phone"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      WhatsApp / Phone Number
                    </label>
                    <input
                      id="book-call-phone"
                      type="tel"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_PHONE_LEN}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-4 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="book-call-date"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Preferred Date
                    </label>
                    <div className="relative">
                      <input
                        id="book-call-date"
                        type="date"
                        min={minDate}
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="book-call-time"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Preferred Time
                    </label>
                    <select
                      id="book-call-time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink focus:outline-none focus:border-accent"
                    >
                      {CALL_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="book-call-service"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Service Needed
                    </label>
                    <select
                      id="book-call-service"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink focus:outline-none focus:border-accent"
                    >
                      {serviceOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-500/10 border border-red-500/35 p-4 flex items-start gap-3 text-sm text-red-600 dark:text-red-200"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p>{errorMsg}</p>
                  </div>
                )}

                {bookedSummary && (
                  <div
                    role="status"
                    className="rounded-xl bg-emerald-500/10 border border-emerald-500/35 p-4 space-y-3 text-sm text-emerald-700 dark:text-emerald-200"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">
                          Call slot requested for {bookedSummary.date} at{' '}
                          {bookedSummary.time}!
                        </p>
                        <p className="text-xs opacity-90 mt-1">
                          AizerTech GH has saved your booking for{' '}
                          {bookedSummary.service} and will confirm on{' '}
                          {bookedSummary.phone}.
                        </p>
                      </div>
                    </div>
                    <a
                      href={buildWhatsAppUrl(
                        `Hello AizerTech GH, I just booked a free discovery call for ${bookedSummary.date} at ${bookedSummary.time} regarding ${bookedSummary.service}. My name is ${bookedSummary.name} (${bookedSummary.phone}).`,
                        cms.hero.whatsappNumber
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="haptic-tap inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-[#070708] text-xs font-semibold hover:bg-[#2EE372]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Confirm Instantly on WhatsApp</span>
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="haptic-tap w-full py-3.5 px-6 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Booking Your Call...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Book My Free Call</span>
                    </>
                  )}
                </button>
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};
