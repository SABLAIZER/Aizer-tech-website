import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
} from 'lucide-react';
import { db } from '../firebase';
import {
  BUDGET_OPTIONS,
  BudgetTier,
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  SERVICE_OPTIONS,
  ServiceType,
  StudioSettings,
  VALIDATION_LIMITS,
} from '../types';
import { Reveal } from './Reveal';

interface ContactSectionProps {
  settings: StudioSettings;
  selectedService: ServiceType;
  selectedBudget: BudgetTier;
  onChangeService: (service: ServiceType) => void;
  onChangeBudget: (budget: BudgetTier) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  settings,
  selectedService,
  selectedBudget,
  onChangeService,
  onChangeBudget,
}) => {
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<{
    type: 'idle' | 'success' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState({ type: 'idle', text: '' });

    const cleanName = senderName.trim();
    const cleanEmail = senderEmail.trim();
    const cleanPhone = senderPhone.trim();
    const cleanMessage = message.trim();

    if (cleanName.length < VALIDATION_LIMITS.MIN_NAME_LEN) {
      setSubmitState({
        type: 'error',
        text: `Please enter your name (at least ${VALIDATION_LIMITS.MIN_NAME_LEN} characters).`,
      });
      return;
    }

    if (
      cleanEmail.length < VALIDATION_LIMITS.MIN_EMAIL_LEN ||
      !VALIDATION_LIMITS.EMAIL_REGEX.test(cleanEmail)
    ) {
      setSubmitState({
        type: 'error',
        text: 'Please enter a valid email address.',
      });
      return;
    }

    if (cleanPhone.length > VALIDATION_LIMITS.MAX_PHONE_LEN) {
      setSubmitState({
        type: 'error',
        text: `Phone number must be ${VALIDATION_LIMITS.MAX_PHONE_LEN} characters or fewer.`,
      });
      return;
    }

    if (cleanMessage.length < VALIDATION_LIMITS.MIN_MESSAGE_LEN) {
      setSubmitState({
        type: 'error',
        text: `Please describe your project (at least ${VALIDATION_LIMITS.MIN_MESSAGE_LEN} characters).`,
      });
      return;
    }

    const boundedName = cleanName.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN);
    const boundedEmail = cleanEmail.slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN);
    const boundedPhone = cleanPhone.slice(0, VALIDATION_LIMITS.MAX_PHONE_LEN);
    const boundedMessage = cleanMessage.slice(0, VALIDATION_LIMITS.MAX_MESSAGE_LEN);

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'aizertech_messages'), {
        name: boundedName,
        email: boundedEmail,
        phone: boundedPhone,
        service: selectedService,
        budget: selectedBudget,
        message: boundedMessage,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSenderName('');
      setSenderEmail('');
      setSenderPhone('');
      setMessage('');
      setSubmitState({
        type: 'success',
        text: 'Thank you! Your brief has been saved and Sablaizer will respond shortly.',
      });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Could not submit your inquiry right now. Please try WhatsApp below.';
      setSubmitState({
        type: 'error',
        text: `Unable to send brief: ${msg}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-28 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 min-w-0">
            <Reveal>
              <p className="text-sm text-accent font-medium mb-3">
                Start Your Project
              </p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-4">
                Request a quote or send your project brief.
              </h2>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed mb-8">
                Every inquiry goes straight to Sablaizer&apos;s private Aizer Tech inbox in Accra. Most project quotes are returned within the same business day.
              </p>

              <div className="space-y-4 pt-6 border-t border-hairline">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Accra, Ghana
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Led by Evans Kwaku Sablah (Sablaizer) · Local &amp; International Clients
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={buildWhatsAppUrl(
                      `Hello Aizer Tech, I would like a quote for ${selectedService} (${selectedBudget}).`,
                      settings.whatsappNumber
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="haptic-tap ios-glass-subtle inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium text-ink hover:border-[#25D366]/60"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                    <span>WhatsApp {formatWhatsAppDisplay(settings.whatsappNumber)}</span>
                  </a>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="text-xs font-mono-tabular text-ink-muted hover:text-accent transition-colors"
                  >
                    {settings.contactEmail}
                  </a>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Kwame Mensah"
                      className="w-full px-4 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_EMAIL_LEN}
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="kwame@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      WhatsApp / Phone (Optional)
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      maxLength={VALIDATION_LIMITS.MAX_PHONE_LEN}
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-4 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-service"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Service Tier
                    </label>
                    <select
                      id="contact-service"
                      value={selectedService}
                      onChange={(e) =>
                        onChangeService(e.target.value as ServiceType)
                      }
                      className="w-full px-3.5 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink focus:outline-none focus:border-accent"
                    >
                      {SERVICE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-budget"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Estimated Budget
                    </label>
                    <select
                      id="contact-budget"
                      value={selectedBudget}
                      onChange={(e) =>
                        onChangeBudget(e.target.value as BudgetTier)
                      }
                      className="w-full px-3.5 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink focus:outline-none focus:border-accent"
                    >
                      {BUDGET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-medium text-ink-secondary mb-1.5"
                  >
                    Project Details
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share what you want to build (business website, mobile app, food ordering platform), key features, and your timeline..."
                    className="w-full px-4 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent resize-y"
                  />
                </div>

                {submitState.type === 'success' && (
                  <div
                    role="status"
                    className="rounded-xl bg-emerald-500/10 border border-emerald-500/35 p-4 flex items-start gap-3 text-sm text-emerald-600 dark:text-emerald-200"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="font-medium">{submitState.text}</p>
                  </div>
                )}

                {submitState.type === 'error' && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-500/10 border border-red-500/35 p-4 flex items-start gap-3 text-sm text-red-600 dark:text-red-200"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p>{submitState.text}</p>
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
                      <span>Sending Project Brief...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Project Brief</span>
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
