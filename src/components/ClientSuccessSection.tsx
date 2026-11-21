import React from 'react';
import { Reveal } from './Reveal';

interface ClientTestimonial {
  id: string;
  projectLabel: string;
  outcomeMetric: string;
  quote: string;
  clientName: string;
  initials: string;
  role: string;
  company: string;
}

const TESTIMONIALS: ClientTestimonial[] = [
  {
    id: 'chopbox-testimonial',
    projectLabel: 'Food Ordering App · Osu, Accra',
    outcomeMetric: '+38% Direct Repeat Orders',
    quote:
      'Before Aizer Tech built our mobile ordering app, third-party delivery commissions took over a fifth of every plate. Sablaizer shipped our iOS and Android app with instant MTN MoMo checkout in four weeks, lifting direct repeat orders by 38% in our first quarter.',
    clientName: 'Kwabena Mensah-Bonsu',
    initials: 'KM',
    role: 'Co-Founder',
    company: 'ChopBox Kitchen',
  },
  {
    id: 'osu-ridge-testimonial',
    projectLabel: 'Business Website · Airport, Accra',
    outcomeMetric: '3.2x Weekly Consultations',
    quote:
      'Our old site loaded slowly on mobile and rarely converted visitors into bookings. Aizer Tech rebuilt our entire presence under the business website tier with structured service pages and WhatsApp lead routing—tripling our qualified weekly inquiries.',
    clientName: 'Abena Osei-Tutu',
    initials: 'AO',
    role: 'Managing Partner',
    company: 'Osu Ridge Advisory',
  },
  {
    id: 'kentepay-testimonial',
    projectLabel: 'Merchant Mobile App · Accra & Kumasi',
    outcomeMetric: '2 hrs/night Reconciliation Saved',
    quote:
      'Closing daily Mobile Money sales across two retail branches used to take our managers two hours every evening. The custom merchant companion app Sablaizer engineered now syncs collections in real time and dispatches digital WhatsApp receipts.',
    clientName: 'Kofi Boateng',
    initials: 'KB',
    role: 'Operations Director',
    company: 'KentePay Retail Group',
  },
];

export const ClientSuccessSection: React.FC = () => {
  return (
    <section
      id="client-success"
      className="section-ambient py-16 sm:py-20 lg:py-28 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-8 mb-10 sm:mb-14">
            <div className="max-w-2xl">
              <p className="text-sm text-accent font-medium mb-3">
                Client Success
              </p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-1">
                Measured outcomes for businesses across Accra and beyond.
              </h2>
            </div>
            <p className="text-sm lg:text-base text-ink-muted max-w-md leading-relaxed">
              Verified partner feedback from founders and operators running Aizer Tech websites and mobile applications in production.
            </p>
          </div>
        </Reveal>

        {/* 3-Column iOS Frosted Glass Testimonial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <Reveal key={item.id} delay={idx * 0.06} className="w-full">
              <article className="h-full w-full min-w-0 ios-glass rounded-[22px] p-5 sm:p-7 lg:p-8 flex flex-col justify-between transition-colors duration-150 hover:border-accent/50">
                <div>
                  {/* Quiet Unboxed Project Metadata + Outcome Metric */}
                  <div className="pb-5 mb-6 border-b border-hairline">
                    <p className="text-xs text-ink-muted mb-2 leading-snug">
                      {item.projectLabel}
                    </p>
                    <p className="font-mono-tabular text-base font-semibold text-accent leading-[1.2]">
                      {item.outcomeMetric}
                    </p>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-sm lg:text-[15px] text-ink-secondary leading-relaxed mb-8">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                </div>

                {/* Client Attribution */}
                <div className="pt-5 border-t border-hairline flex items-center gap-3.5">
                  <div
                    aria-hidden="true"
                    className="ios-glass-subtle w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-display text-sm font-semibold text-accent"
                  >
                    {item.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink leading-[1.2] break-words">
                      {item.clientName}
                    </p>
                    <p className="text-xs text-ink-muted leading-snug mt-1 break-words">
                      {item.role} · {item.company}
                    </p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
