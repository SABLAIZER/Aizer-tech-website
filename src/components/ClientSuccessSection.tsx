import React from 'react';
import { MessageSquareQuote, Star } from 'lucide-react';
import { TestimonialRecord } from '../types';
import { Reveal } from './Reveal';

interface ClientSuccessSectionProps {
  testimonials: TestimonialRecord[];
  loading?: boolean;
  onStartProject?: () => void;
}

function getClientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export const ClientSuccessSection: React.FC<ClientSuccessSectionProps> = ({
  testimonials,
  loading = false,
  onStartProject,
}) => {
  return (
    <section
      id="client-success"
      aria-labelledby="client-success-heading"
      className="section-ambient py-16 sm:py-20 lg:py-28 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-8 mb-10 sm:mb-14">
            <div className="max-w-2xl">
              <p className="text-sm text-accent font-medium mb-3">
                What Clients Say
              </p>
              <h2
                id="client-success-heading"
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-1"
              >
                Verified reviews from AizerTech GH clients.
              </h2>
            </div>
            <p className="text-sm lg:text-base text-ink-muted max-w-md leading-relaxed">
              Real feedback approved and published straight from our Accra studio client ledger.
            </p>
          </div>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="ios-glass rounded-[22px] p-6 sm:p-8 h-60 animate-pulse"
              />
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="ios-glass rounded-[22px] p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="ios-glass-subtle w-12 h-12 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink mb-2">
              Verified client reviews will appear here soon.
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed mb-5">
              We publish only real, verified reviews from completed AizerTech GH launches.
            </p>
            {onStartProject && (
              <button
                type="button"
                onClick={onStartProject}
                className="haptic-tap inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent-btn text-accent-ink text-xs font-semibold hover:bg-accent-hover cursor-pointer"
              >
                Start Your Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((item, idx) => {
              const safeRating = Math.max(1, Math.min(5, Math.round(item.rating || 5)));
              return (
                <Reveal key={item.id} delay={idx * 0.05} className="w-full">
                  <article className="h-full w-full min-w-0 ios-glass rounded-[22px] p-5 sm:p-7 lg:p-8 flex flex-col justify-between transition-colors duration-150 hover:border-accent/50">
                    <div>
                      {/* Rating Stars + Service */}
                      <div className="pb-5 mb-6 border-b border-hairline flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-accent leading-snug">
                          {item.service}
                        </p>
                        <div
                          className="inline-flex items-center gap-1 shrink-0"
                          aria-label={`${safeRating} out of 5 stars`}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= safeRating
                                  ? 'text-accent fill-current'
                                  : 'text-ink-subtle'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Quote */}
                      <blockquote className="text-sm lg:text-[15px] text-ink-secondary leading-relaxed mb-8">
                        &ldquo;{item.message}&rdquo;
                      </blockquote>
                    </div>

                    {/* Client Attribution */}
                    <div className="pt-5 border-t border-hairline flex items-center gap-3.5">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.clientName}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border border-hairline-strong shrink-0"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="ios-glass-subtle w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-display text-sm font-semibold text-accent"
                        >
                          {getClientInitials(item.clientName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink leading-[1.2] break-words">
                          {item.clientName}
                        </p>
                        <p className="text-xs text-ink-muted leading-snug mt-1 break-words">
                          Verified AizerTech GH Client
                        </p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
