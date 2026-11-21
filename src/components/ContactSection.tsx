import React, { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Mail, MapPin, MessageCircle, Send, Wallet } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Reveal } from './Reveal';
import {
  ADMIN_EMAIL,
  BUDGET_OPTIONS,
  BudgetTier,
  buildWhatsAppUrl,
  SERVICE_OPTIONS,
  ServiceType,
  VALIDATION_LIMITS,
  WHATSAPP_DISPLAY,
} from '../types';

interface ContactSectionProps {
  selectedService: ServiceType;
  selectedBudget: BudgetTier;
  onChangeService: (service: ServiceType) => void;
  onChangeBudget: (budget: BudgetTier) => void;
}

function generateDocumentId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'msg_';
  for (let i = 0; i < 16; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
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
  const [errorText, setErrorText] = useState<string | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<{
    id: string;
    name: string;
    service: ServiceType;
    brief: string;
  } | null>(null);

  useEffect(() => {
    setErrorText(null);
  }, [selectedService, selectedBudget]);

  const validateForm = (): string | null => {
    const cleanName = senderName.trim();
    const cleanEmail = senderEmail.trim();
    const cleanPhone = senderPhone.trim();
    const cleanMessage = message.trim();

    if (
      cleanName.length < VALIDATION_LIMITS.MIN_NAME_LEN ||
      cleanName.length > VALIDATION_LIMITS.MAX_NAME_LEN
    ) {
      return `Please enter your name (${VALIDATION_LIMITS.MIN_NAME_LEN}–${VALIDATION_LIMITS.MAX_NAME_LEN} characters).`;
    }
    if (
      cleanEmail.length < VALIDATION_LIMITS.MIN_EMAIL_LEN ||
      cleanEmail.length > VALIDATION_LIMITS.MAX_EMAIL_LEN ||
      !VALIDATION_LIMITS.EMAIL_REGEX.test(cleanEmail)
    ) {
      return 'Please enter a valid email address.';
    }
    if (cleanPhone.length > VALIDATION_LIMITS.MAX_PHONE_LEN) {
      return `Phone number must be under ${VALIDATION_LIMITS.MAX_PHONE_LEN} characters.`;
    }
    if (
      cleanMessage.length < VALIDATION_LIMITS.MIN_MESSAGE_LEN ||
      cleanMessage.length > VALIDATION_LIMITS.MAX_MESSAGE_LEN
    ) {
      return `Please include a short project brief (${VALIDATION_LIMITS.MIN_MESSAGE_LEN}–${VALIDATION_LIMITS.MAX_MESSAGE_LEN} characters).`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setSubmitting(true);
    const messageId = generateDocumentId();
    const docPath = `contactMessages/${messageId}`;

    const payload = {
      senderName: senderName.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
      senderEmail: senderEmail.trim().slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN),
      senderPhone: senderPhone.trim().slice(0, VALIDATION_LIMITS.MAX_PHONE_LEN),
      serviceType: selectedService,
      budgetTier: selectedBudget,
      message: message.trim().slice(0, VALIDATION_LIMITS.MAX_MESSAGE_LEN),
      status: 'new' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'contactMessages', messageId), payload);
      setSavedReceipt({
        id: messageId,
        name: payload.senderName,
        service: payload.serviceType,
        brief: payload.message,
      });
      setSenderName('');
      setSenderEmail('');
      setSenderPhone('');
      setMessage('');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      } catch {
        setErrorText(
          'Unable to save your message right now. Please try again or reach Sablaizer directly on WhatsApp.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Direct Studio Contact & Pricing Summary */}
          <Reveal className="lg:col-span-5 w-full">
            <p className="text-sm text-accent font-medium mb-3">
              Start Your Build
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-5">
              Tell Aizer Tech what you are building.
            </h2>
            <p className="text-sm lg:text-base text-ink-secondary leading-relaxed mb-8">
              Send your project brief using the form and your message is saved directly to the studio database for immediate review—or open a direct WhatsApp chat right now.
            </p>

            {/* Direct WhatsApp & MoMo Frosted Glass Card */}
            <div className="ios-glass rounded-[22px] p-5 sm:p-6 mb-6 space-y-3.5">
              <div>
                <p className="text-xs text-ink-muted mb-1">Fastest Response</p>
                <h3 className="font-display text-lg font-semibold text-ink leading-[1.2]">
                  WhatsApp &amp; MoMo Kickoff
                </h3>
              </div>
              <a
                href={buildWhatsAppUrl(
                  `Hello Aizer Tech, I want to discuss a ${selectedService} project.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="haptic-tap w-full inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-xl bg-[#25D366] text-[#070708] text-sm font-semibold hover:bg-[#2EE372] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] text-center"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp {WHATSAPP_DISPLAY}</span>
              </a>

              <a
                href={buildWhatsAppUrl(
                  `Hello Aizer Tech, I am ready to pay the 50% deposit via MoMo for ${selectedService}. Please send your MoMo details.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="haptic-tap w-full inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-3.5 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] text-center"
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Pay 50% Deposit via MoMo</span>
              </a>
            </div>

            {/* Studio Details */}
            <div className="space-y-4 text-sm text-ink-secondary pt-2">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <span>Accra, Ghana · Founded by Sablaizer - Evans Kwaku Sablah</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <span className="break-all">{ADMIN_EMAIL}</span>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Persistent Contact Form */}
          <Reveal delay={0.06} className="lg:col-span-7 w-full">
            <div className="ios-glass rounded-[24px] p-5 sm:p-8 lg:p-10">
              {savedReceipt ? (
                <div className="py-6">
                  <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center text-accent mb-5">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-ink leading-[1.2] mb-3">
                    Message saved, {savedReceipt.name}.
                  </h3>
                  <p className="text-sm text-ink-secondary leading-relaxed mb-6">
                    Your inquiry for{' '}
                    <span className="text-ink font-medium">
                      {savedReceipt.service}
                    </span>{' '}
                    has been stored securely. Reference:{' '}
                    <span className="font-mono-tabular text-accent">
                      {savedReceipt.id}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href={buildWhatsAppUrl(
                        `Hello Aizer Tech, I just submitted my project brief (Ref: ${savedReceipt.id}) for ${savedReceipt.service}: "${savedReceipt.brief}"`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="haptic-tap inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-[#070708] text-sm font-semibold hover:bg-[#2EE372]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Also Ping on WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setSavedReceipt(null)}
                      className="haptic-tap ios-glass-subtle px-5 py-3 rounded-xl text-sm font-medium text-ink hover:border-accent/50 cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="senderName"
                        className="block text-xs font-medium text-ink-secondary mb-2"
                      >
                        Full Name *
                      </label>
                      <input
                        id="senderName"
                        name="senderName"
                        type="text"
                        required
                        maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="e.g. Nana Yaw Boateng"
                        className="w-full rounded-lg bg-field border border-hairline-strong px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="senderEmail"
                        className="block text-xs font-medium text-ink-secondary mb-2"
                      >
                        Email Address *
                      </label>
                      <input
                        id="senderEmail"
                        name="senderEmail"
                        type="email"
                        required
                        maxLength={VALIDATION_LIMITS.MAX_EMAIL_LEN}
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full rounded-lg bg-field border border-hairline-strong px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="senderPhone"
                        className="block text-xs font-medium text-ink-secondary mb-2"
                      >
                        WhatsApp / Phone Number
                      </label>
                      <input
                        id="senderPhone"
                        name="senderPhone"
                        type="tel"
                        maxLength={VALIDATION_LIMITS.MAX_PHONE_LEN}
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="+233 24 000 0000"
                        className="w-full rounded-lg bg-field border border-hairline-strong px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="serviceType"
                        className="block text-xs font-medium text-ink-secondary mb-2"
                      >
                        Service Needed *
                      </label>
                      <select
                        id="serviceType"
                        name="serviceType"
                        value={selectedService}
                        onChange={(e) => onChangeService(e.target.value as ServiceType)}
                        className="w-full rounded-lg bg-field border border-hairline-strong px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                      >
                        {SERVICE_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-surface text-ink">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-ink-secondary mb-2.5">
                      Estimated Budget (GHS)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                      {BUDGET_OPTIONS.map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => onChangeBudget(tier)}
                          className={`haptic-tap-sm py-2.5 px-3 rounded-lg text-xs font-mono-tabular font-medium border cursor-pointer text-center ${
                            selectedBudget === tier
                              ? 'bg-accent/15 border-accent text-ink'
                              : 'bg-field border-hairline-strong text-ink-muted hover:text-ink'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="projectMessage"
                      className="block text-xs font-medium text-ink-secondary mb-2"
                    >
                      Project Details *
                    </label>
                    <textarea
                      id="projectMessage"
                      name="message"
                      rows={4}
                      required
                      maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your business, key features (e.g., website pages, food ordering, Mobile Money checkout), and ideal launch timeline..."
                      className="w-full rounded-lg bg-field border border-hairline-strong px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors resize-y"
                    />
                  </div>

                  {errorText && (
                    <div
                      role="alert"
                      className="rounded-lg bg-red-500/10 border border-red-500/35 px-4 py-3 text-xs text-red-600 dark:text-red-300"
                    >
                      {errorText}
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-ink-subtle leading-relaxed">
                      Messages are saved securely to our studio database.
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="haptic-tap w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover disabled:opacity-60 sm:whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                      <span>{submitting ? 'Saving Message...' : 'Save & Send Message'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
