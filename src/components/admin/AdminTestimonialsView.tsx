import React, { useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  Loader2,
  Plus,
  Quote,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { TestimonialRecord } from '../../types';
import { getInitial } from './adminUtils';

interface AdminTestimonialsViewProps {
  testimonials: TestimonialRecord[];
  loadingTestimonials: boolean;
  onAddTestimonial: (payload: {
    clientName: string;
    service: string;
    rating: number;
    message: string;
    photoUrl: string;
    approved: boolean;
  }) => Promise<void>;
  onToggleApprove: (testimonial: TestimonialRecord) => Promise<void>;
  onDeleteTestimonial: (id: string) => Promise<void>;
}

async function compressAvatarPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read photo file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const size = 240;
        const scale = Math.max(size / img.width, size / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable.'));
          return;
        }
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const AdminTestimonialsView: React.FC<AdminTestimonialsViewProps> = ({
  testimonials,
  loadingTestimonials,
  onAddTestimonial,
  onToggleApprove,
  onDeleteTestimonial,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('Business Website');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [approvedOnCreate, setApprovedOnCreate] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const approvedCount = testimonials.filter((t) => t.approved).length;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressAvatarPhoto(file);
      setPhotoUrl(dataUrl);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Photo upload failed.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (clientName.trim().length < 2) {
      setFormError('Please enter client name.');
      return;
    }
    if (message.trim().length < 5) {
      setFormError('Please enter client feedback message.');
      return;
    }

    setSaving(true);
    try {
      await onAddTestimonial({
        clientName: clientName.trim(),
        service: service.trim() || 'Digital Project',
        rating,
        message: message.trim(),
        photoUrl: photoUrl.trim(),
        approved: approvedOnCreate,
      });
      setClientName('');
      setService('Business Website');
      setRating(5);
      setMessage('');
      setPhotoUrl('');
      setApprovedOnCreate(true);
      setModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save testimonial.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: TestimonialRecord) => {
    setBusyId(item.id);
    try {
      await onToggleApprove(item);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await onDeleteTestimonial(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="luxury-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Social Proof Control
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
            Testimonials ({testimonials.length})
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {approvedCount} approved &amp; live on your website&apos;s &ldquo;What Clients Say&rdquo; section
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Testimonial</span>
        </button>
      </div>

      {loadingTestimonials ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700] mx-auto mb-4">
            <Quote className="w-6 h-6" />
          </div>
          <p className="font-luxury text-xl font-semibold text-white mb-2">
            No testimonials yet
          </p>
          <p className="text-xs text-neutral-400 mb-6">
            Add real client reviews and click Approve to show them live on your website.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Testimonial</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testimonials.map((item, idx) => {
            const isBusy = busyId === item.id;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                className={`luxury-card rounded-3xl p-6 flex flex-col justify-between gap-4 ${
                  item.approved ? 'border-emerald-500/30' : 'border-white/10 opacity-85'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.clientName}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border border-[#D4AF37]/45 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitial(item.clientName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="font-sora text-base font-bold text-white truncate">
                          {item.clientName}
                        </h2>
                        <p className="text-xs text-[#D4AF37] truncate">
                          {item.service}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        item.approved
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                          : 'bg-white/5 text-neutral-400 border border-white/15'
                      }`}
                    >
                      {item.approved ? 'Live on Website' : 'Hidden'}
                    </span>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= item.rating
                            ? 'text-[#FFD700] fill-[#FFD700]'
                            : 'text-neutral-600'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                    &ldquo;{item.message}&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-white/10">
                  {item.approved ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggle(item)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggle(item)}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl gold-gradient-btn text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(item.id)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/15 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Add Testimonial Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="font-luxury text-xl font-bold text-white">
                Add Client Testimonial
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setModalOpen(false)}
                className="min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Abena Osei"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Service
                </label>
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="Business Website"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Star Rating (1–5)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer"
                    aria-label={`${star} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating
                          ? 'text-[#FFD700] fill-[#FFD700]'
                          : 'text-neutral-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono-tabular text-[#FFD700] ml-2">
                  {rating}/5
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Testimonial Message
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did the client say about working with AizerTech GH?"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-300">
                Client Photo URL (Optional)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://... or upload photo"
                  className="flex-1 rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <label className="min-h-[40px] px-4 py-2 rounded-2xl bg-white/[0.06] border border-[#D4AF37]/45 text-xs font-semibold text-[#FFD700] inline-flex items-center justify-center gap-1.5 cursor-pointer">
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={approvedOnCreate}
                onChange={(e) => setApprovedOnCreate(e.target.checked)}
                className="w-4 h-4 rounded accent-[#D4AF37]"
              />
              <span>Approve &amp; show on website immediately</span>
            </label>

            {formError && (
              <p className="text-xs text-red-300 bg-red-500/12 border border-red-500/35 rounded-2xl px-4 py-2.5">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Testimonial</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
