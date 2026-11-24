import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FolderKanban,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { StudioProjectRecord, StudioProjectStatus } from '../../types';
import { computeDashboardMetrics, formatGhs, formatTimeAgo } from './adminUtils';
import { ContactMessageRecord } from '../../types';

interface AdminProjectsViewProps {
  projects: StudioProjectRecord[];
  messages: ContactMessageRecord[];
  loadingProjects: boolean;
  onOpenNewProjectModal: () => void;
  onToggleProjectStatus: (project: StudioProjectRecord) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export const AdminProjectsView: React.FC<AdminProjectsViewProps> = ({
  projects,
  messages,
  loadingProjects,
  onOpenNewProjectModal,
  onToggleProjectStatus,
  onDeleteProject,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const metrics = computeDashboardMetrics(messages, projects);

  const handleToggle = async (project: StudioProjectRecord) => {
    setBusyId(project.id);
    try {
      await onToggleProjectStatus(project);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await onDeleteProject(id);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  const statusPill = (status: StudioProjectStatus) =>
    status === 'done'
      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
      : 'bg-[#D4AF37]/15 text-[#FFD700] border border-[#D4AF37]/35';

  return (
    <div className="space-y-6">
      {/* Header + Revenue Summary */}
      <div className="luxury-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Revenue &amp; Delivery Ledger
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
            Projects ({projects.length})
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-mono-tabular">
            {metrics.doneCount} completed · Avg {formatGhs(metrics.averageDonePrice)} · Total Est. Revenue{' '}
            <span className="text-[#FFD700] font-semibold">
              {formatGhs(metrics.estimatedRevenue)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewProjectModal}
          className="haptic-tap gold-gradient-btn px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <FolderPlus className="w-4 h-4" />
          <span>+ New Project</span>
        </button>
      </div>

      {loadingProjects ? (
        <div className="space-y-3">
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="h-28 rounded-3xl bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700] mx-auto mb-4">
            <FolderKanban className="w-6 h-6" />
          </div>
          <p className="font-luxury text-lg font-semibold text-white mb-2">
            No projects logged yet, CEO.
          </p>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
            Add real client builds here. Completed projects automatically calculate your Estimated Revenue in GHS on the dashboard.
          </p>
          <button
            type="button"
            onClick={onOpenNewProjectModal}
            className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project, idx) => (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
              className="luxury-card luxury-card-hover rounded-3xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h2 className="font-sora text-base font-bold text-white truncate">
                      {project.title}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {project.clientName}
                      {project.clientPhone ? ` · ${project.clientPhone}` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusPill(
                      project.status
                    )}`}
                  >
                    {project.status === 'done' ? 'Done' : 'In Progress'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-y border-white/10 my-3">
                  <span className="px-3 py-1 rounded-full bg-[#D4AF37]/12 border border-[#D4AF37]/25 text-[11px] font-medium text-[#FFD700]">
                    {project.serviceType}
                  </span>
                  <span className="font-sora font-mono-tabular text-lg font-bold gold-gradient-text">
                    {formatGhs(project.amountGhs)}
                  </span>
                </div>

                {project.notes && (
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {project.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="text-[11px] font-mono-tabular text-neutral-500">
                  {formatTimeAgo(project.createdAt)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === project.id}
                    onClick={() => handleToggle(project)}
                    className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-white hover:border-[#D4AF37]/60 cursor-pointer disabled:opacity-50"
                  >
                    {project.status === 'done' ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Mark Active</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mark Done</span>
                      </>
                    )}
                  </button>

                  {confirmDeleteId === project.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === project.id}
                        onClick={() => handleDelete(project.id)}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[40px] px-2.5 py-2 rounded-xl bg-white/5 text-xs text-neutral-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete project ${project.title}`}
                      onClick={() => setConfirmDeleteId(project.id)}
                      className="haptic-tap-sm min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-red-500/35 text-red-400 hover:bg-red-500/15 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
};
