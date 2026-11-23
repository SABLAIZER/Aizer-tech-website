import React from 'react';
import { Reveal } from './Reveal';

const PILLARS = [
  {
    number: '01.',
    title: 'Fast Delivery',
    metric: '7–21 Day Launch',
    description:
      'We ship focused first versions quickly so you start collecting orders, bookings, and customer payments without months of agency delays.',
  },
  {
    number: '02.',
    title: 'Affordable',
    metric: 'From GHS 450',
    description:
      'Clear Ghana Cedi starting prices, milestone splits, and zero hidden retainers—built to match Ghanaian startups and growing brands.',
  },
  {
    number: '03.',
    title: 'Support',
    metric: 'Direct Founder Care',
    description:
      'Work directly with Sablaizer in Accra via WhatsApp and email. We handle updates, bug fixes, domain setup, and post-launch scaling.',
  },
];

export const WhyUsSection: React.FC = () => {
  return (
    <section
      id="why-us"
      className="py-16 sm:py-24 border-b border-hairline bg-canvas"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-xs font-medium text-neon mb-2">
                Why Choose AizerTech GH
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
                Built for Speed, Clarity, and Real Sales
              </h2>
              <p className="mt-4 text-sm sm:text-base text-ink-muted leading-relaxed max-w-md">
                Most agencies drag timelines and inflate invoices. AizerTech GH
                combines sharp product engineering with direct accountability from
                first sketch to launch day.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7 divide-y divide-hairline border-y border-hairline">
            {PILLARS.map((pillar, index) => (
              <Reveal key={pillar.title} delay={0.04 * index}>
                <div className="py-6 sm:py-7 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6 items-baseline">
                  <div className="sm:col-span-5 flex items-baseline gap-3">
                    <span className="font-mono-tabular text-xs font-semibold text-neon">
                      {pillar.number}
                    </span>
                    <h3 className="font-display text-xl font-semibold text-white">
                      {pillar.title}
                    </h3>
                  </div>

                  <div className="sm:col-span-7">
                    <p className="font-mono-tabular text-xs font-medium text-neon mb-1.5">
                      {pillar.metric}
                    </p>
                    <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
