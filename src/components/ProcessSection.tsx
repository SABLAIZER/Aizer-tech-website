import React from 'react';
import { Reveal } from './Reveal';

const PROCESS_STEPS = [
  {
    step: '01.',
    title: 'Scope & Fixed Quote',
    duration: 'Day 1',
    detail:
      'We align on your business goals, required pages or mobile app screens, and confirm transparent GHS pricing before a single line of code is written.',
  },
  {
    step: '02.',
    title: 'Design & Engineering',
    duration: 'Weeks 1 – 4',
    detail:
      'You get direct preview links throughout the build—reviewing mobile responsiveness, payment flows, and database speed in real time.',
  },
  {
    step: '03.',
    title: 'Launch & Handover',
    duration: 'Go-Live',
    detail:
      'Full deployment to your domain or App Store / Play Store, team walkthrough in Accra or remotely, and ongoing WhatsApp technical support.',
  },
];

export const ProcessSection: React.FC = () => {
  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className="py-16 sm:py-20 lg:py-24 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <Reveal>
          <div className="max-w-2xl mb-10 sm:mb-12">
            <p className="text-sm text-accent font-medium mb-3">How Projects Ship</p>
            <h2
              id="process-heading"
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-1"
            >
              Direct collaboration from first message to live launch.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROCESS_STEPS.map((item, idx) => (
            <Reveal key={item.step} delay={idx * 0.06} className="w-full">
              <div className="h-full w-full min-w-0 ios-glass rounded-[22px] p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs mb-5">
                    <span className="font-mono-tabular text-accent font-semibold">
                      {item.step}
                    </span>
                    <span className="text-ink-subtle">{item.duration}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink leading-[1.2] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
