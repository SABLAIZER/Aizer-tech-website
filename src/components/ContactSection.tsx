import React, { useEffect, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  WifiOff,
} from 'lucide-react';
import {
  db,
  getOfflineOutbox,
  isLikelyOfflineError,
  saveToOfflineOutbox,
  syncOfflineOutbox,
} from '../firebase';
import {
  BUDGET_OPTIONS,
  BudgetOption,
  buildWhatsAppUrl,
  CONTACT_SERVICE_OPTIONS,
  isUsableWhatsAppNumber,
  ServiceOption,
  VALIDATION_LIMITS,
} from '../types';
import { Reveal } from './Reveal';

interface ContactSectionProps {
  selectedService: ServiceOption;
  selectedBudget: BudgetOption;
  prefillNote: string;
  whatsappNumber: string;
  onChangeService: (service: ServiceOption) => void;
  onChangeBudget: (budget: BudgetOption) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  selectedService,
  selectedBudget,
  prefillNote,
  whatsappNumber,
  onChangeService,
  onChangeBudget,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<{
    type: 'idle' | 'success' | 'offline-queued' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(
    () => getOfflineOutbox().length
  );

  useEffect(() => {
    if (prefillNote && !message.trim()) {
      setMessage(prefillNote);
    }
  }, [prefillNote]);

  useEffect(() => {
    const attemptSync = async () => {
      const synced = await syncOfflineOutbox();
      setPendingOfflineCount(getOfflineOutbox().length);
      if (synced > 0) {
        setSubmitState({
          type: 'success',
          text: 'Message Sent Successfully! AizerTech will reply soon.',
        });
      }
    };

    void attemptSync();
    window.addEventListener('online', attemptSync);
    return () => window.removeEventListener('online', attemptSync);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState({ type: 'idle', text: '' });

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanMessage = message.trim();

    if (cleanName.length < VALIDATION_LIMITS.MIN_NAME_LEN) {
      setSubmitState({
        type: 'error',
        text: 'Please enter your full name (at least 2 characters).',
      });
      return;
    }

    if (!VALIDATION_LIMITS.EMAIL_REGEX.test(cleanEmail)) {
      setSubmitState({
        type: 'error',
        text: 'Please enter a valid email address.',
      });
      return;
    }

    if (cleanPhone.length < VALIDATION_LIMITS.MIN_PHONE_LEN) {
      setSubmitState({
        type: 'error',
        text: 'Please enter a valid phone or WhatsApp number.',
      });
      return;
    }

    if (cleanMessage.length < VALIDATION_LIMITS.MIN_MESSAGE_LEN) {
      setSubmitState({
        type: 'error',
        text: 'Please describe your project (at least 5 characters).',
      });
      return;
    }

    const boundedName = cleanName.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN);
    const boundedEmail = cleanEmail.slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN);
    const boundedPhone = cleanPhone.slice(0, VALIDATION_LIMITS.MAX_PHONE_LEN);
    const boundedMessage = cleanMessage.slice(0, VALIDATION_LIMITS.MAX_MESSAGE_LEN);

    setSubmitting(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        saveToOfflineOutbox({
          localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: boundedName,
          email: boundedEmail,
          phone: boundedPhone,
          service: selectedService,
          budget: selectedBudget,
          message: boundedMessage,
          queuedAt: new Date().toISOString(),
        });
        setPendingOfflineCount(getOfflineOutbox().length);
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
        setSubmitState({
          type: 'offline-queued',
          text: 'You appear offline. Your message was saved on your device and will automatically sync to AizerTech once you are back online.',
        });
        return;
      }

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

      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setSubmitState({
        type: 'success',
        text: 'Message Sent Successfully! AizerTech will reply soon.',
      });
    } catch (error) {
      if (isLikelyOfflineError(error)) {
        saveToOfflineOutbox({
          localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: boundedName,
          email: boundedEmail,
          phone: boundedPhone,
          service: selectedService,
          budget: selectedBudget,
          message: boundedMessage,
          queuedAt: new Date().toISOString(),
        });
        setPendingOfflineCount(getOfflineOutbox().length);
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
        setSubmitState({
          type: 'offline-queued',
          text: 'Connection is offline. Your message was saved locally and will automatically sync to AizerTech when internet returns.',
        });
      } else {
        const realMessage =
          error instanceof Error
            ? error.message
            : 'Unable to save your message. Please try again.';
        setSubmitState({
          type: 'error',
          text: `Failed to send message: ${realMessage}`,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasValidWhatsApp = isUsableWhatsAppNumber(whatsappNumber);

  return (
    <section id="contact" className="py-16 sm:py-24 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-xs font-medium text-neon mb-2">
                Start a Conversation
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
                Tell Us What You Want to Launch
              </h2>
              <p className="mt-4 text-sm sm:text-base text-ink-muted leading-relaxed">
                Send your project brief below. Your inquiry goes directly into
                Sablaizer&apos;s AizerTech GH inbox in real time.
              </p>

              <div className="mt-8 space-y-4 pt-6 border-t border-hairline">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neon shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Accra, Ghana
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Owned by Sablaizer · Serving Ghana &amp; global clients
                    </p>
                  </div>
                </div>

                {hasValidWhatsApp && (
                  <div className="pt-2">
                    <a
                      href={buildWhatsAppUrl(
                        whatsappNumber,
                        `Hello AizerTech GH, I would like to discuss a ${selectedService} project.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tap-feedback inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-surface border border-hairline-strong text-sm font-semibold text-white hover:border-neon/60 hover:text-neon"
                    >
                      <MessageCircle className="w-4 h-4 text-neon" />
                      <span>Chat on WhatsApp ({whatsappNumber})</span>
                    </a>
                  </div>
                )}

                {pendingOfflineCount > 0 && (
                  <p className="text-xs text-amber-300 flex items-center gap-2 pt-2">
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span>
                      {pendingOfflineCount} offline message(s) waiting to sync
                      when online.
                    </span>
                  </p>
                )}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={0.05}>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-2xl bg-surface border border-hairline p-6 sm:p-8 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Kwame Mensah"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_EMAIL_LEN}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kwame@company.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Phone / WhatsApp
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_PHONE_LEN}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-service"
                      className="block text-xs font-medium text-ink-secondary mb-1.5"
                    >
                      Service Needed
                    </label>
                    <select
                      id="contact-service"
                      value={selectedService}
                      onChange={(e) =>
                        onChangeService(e.target.value as ServiceOption)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white focus:outline-none focus:border-neon"
                    >
                      {CONTACT_SERVICE_OPTIONS.map((option) => (
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
                      Budget
                    </label>
                    <select
                      id="contact-budget"
                      value={selectedBudget}
                      onChange={(e) =>
                        onChangeBudget(e.target.value as BudgetOption)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white focus:outline-none focus:border-neon"
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
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your app, website, e-commerce store, or brand goals and timeline..."
                    className="w-full px-3.5 py-3 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon resize-y"
                  />
                </div>

                {submitState.type === 'success' && (
                  <div
                    role="status"
                    className="rounded-xl bg-neon/10 border border-neon/40 p-4 flex items-start gap-3 text-sm text-white"
                  >
                    <CheckCircle2 className="w-5 h-5 text-neon shrink-0 mt-0.5" />
                    <p className="font-medium">{submitState.text}</p>
                  </div>
                )}

                {submitState.type === 'offline-queued' && (
                  <div
                    role="status"
                    className="rounded-xl bg-amber-500/10 border border-amber-400/40 p-4 flex items-start gap-3 text-sm text-amber-200"
                  >
                    <WifiOff className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                    <p>{submitState.text}</p>
                  </div>
                )}

                {submitState.type === 'error' && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-500/10 border border-red-400/40 p-4 flex items-start gap-3 text-sm text-red-200"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p>{submitState.text}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="tap-feedback w-full py-3.5 px-6 rounded-xl bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
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
