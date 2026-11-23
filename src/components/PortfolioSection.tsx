import React, { useState } from 'react';
import { ArrowUpRight, MonitorSmartphone } from 'lucide-react';
import { PORTFOLIO_PROJECTS, PortfolioProject, ServiceOption } from '../types';
import { Reveal } from './Reveal';

interface PortfolioSectionProps {
  onSelectProjectService: (service: ServiceOption, projectTitle: string) => void;
}

const ProjectImage: React.FC<{ project: PortfolioProject }> = ({ project }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#0e1512] to-[#08080b]">
        <MonitorSmartphone className="w-8 h-8 text-neon mb-2" />
        <p className="font-display text-sm font-semibold text-white">
          {project.title}
        </p>
      </div>
    );
  }

  return (
    <img
      src={project.imageUrl}
      alt={`${project.title} — ${project.category} by AizerTech GH`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
};

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  onSelectProjectService,
}) => {
  return (
    <section
      id="portfolio"
      className="py-16 sm:py-24 border-b border-hairline bg-surface/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-medium text-neon mb-2">
                Our Work · 6 Selected Builds
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-xl [text-wrap:balance]">
                Real Products Engineered for Revenue &amp; Scale
              </h2>
            </div>
            <p className="text-sm sm:text-base text-ink-muted max-w-md leading-relaxed">
              From fintech wallets and food delivery apps to e-commerce stores and
              packaging identities across Accra and beyond.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PORTFOLIO_PROJECTS.map((project, index) => (
            <Reveal key={project.id} delay={0.03 * index}>
              <article className="group h-full rounded-2xl overflow-hidden bg-surface border border-hairline hover:border-neon/40 transition-colors duration-150 flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#08080b] border-b border-hairline">
                    <ProjectImage project={project} />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#050507]/75 via-transparent to-transparent"
                    />
                    <p className="absolute bottom-3 left-4 font-mono-tabular text-xs font-semibold text-neon">
                      {project.outcome}
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-ink-muted mb-2">
                      <span>{project.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.location}</span>
                    </div>

                    <h3 className="font-display text-xl font-semibold text-white tracking-tight">
                      {project.title}
                    </h3>

                    <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
                      {project.summary}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-hairline/70 flex items-center justify-between">
                  <span className="text-xs text-ink-subtle">
                    Service · {project.serviceType}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectProjectService(project.serviceType, project.title)
                    }
                    className="tap-feedback inline-flex items-center gap-1 text-xs font-semibold text-neon hover:text-neon-hover cursor-pointer whitespace-nowrap"
                  >
                    <span>Build Similar</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
