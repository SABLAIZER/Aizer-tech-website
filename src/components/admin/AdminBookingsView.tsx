import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Trash2,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BookingRecord, BookingStatus } from '../../types';
import {
  buildClientWhatsAppHref,
  formatTimeAgo,
  getInitial,
} from './adminUtils';

interface AdminBookingsViewProps {
  bookings: BookingRecord[];
  loadingBookings: boolean;
  onUpdateBookingStatus: (
    booking: BookingRecord,
    nextStatus: BookingStatus
  ) => Promise<void>;
  onDeleteBooking: (bookingId: string) => Promise<void>;
}

function getBookingBadge(status: BookingStatus) {
  if (status === 'pending') {
    return {
      label: 'Pending',
      className: 'bg-[#D4AF37]/15 text-[#FFD700] border border-[#D4AF37]/45',
    };
  }
  if (status === 'confirmed') {
    return {
      label: 'Confirmed',
      className: 'bg-sky-500/15 text-sky-300 border border-sky-500/40',
    };
  }
  if (status === 'done') {
    return {
      label: 'Done',
      className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40',
    };
  }
  return {
    label: 'Cancelled',
    className: 'bg-red-500/15 text-red-300 border border-red-500/40',
  };
}

export const AdminBookingsView: React.FC<AdminBookingsViewProps> = ({
  bookings,
  loadingBookings,
  onUpdateBookingStatus,
  onDeleteBooking,
}) => {
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      done: bookings.filter((b) => b.status === 'done').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    }),
    [bookings]
  );

  const visibleBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const handleStatus = async (booking: BookingRecord, nextStatus: BookingStatus) => {
    setBusyId(booking.id);
    try {
      await onUpdateBookingStatus(booking, nextStatus);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await onDeleteBooking(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="luxury-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Free Discovery Calls
            </p>
            <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
              Bookings ({bookings.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Call requests scheduled from your public website&apos;s &ldquo;Book Free Call&rdquo; section
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'confirmed', label: `Confirmed (${counts.confirmed})` },
              { id: 'done', label: `Done (${counts.done})` },
              { id: 'cancelled', label: `Cancelled (${counts.cancelled})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                filter === tab.id
                  ? 'gold-gradient-btn'
                  : 'bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loadingBookings ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700] mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="font-luxury text-xl font-semibold text-white mb-2">
            No bookings yet
          </p>
          <p className="text-xs text-neutral-400">
            Free call appointments submitted on your website appear here instantly.
          </p>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="luxury-card rounded-3xl p-8 text-center">
          <p className="text-sm text-neutral-300">
            No bookings in this status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleBookings.map((booking, idx) => {
            const badge = getBookingBadge(booking.status);
            const isBusy = busyId === booking.id;
            const confirmMsg = `Hello ${booking.clientName}, this is Sablaizer from AizerTech GH confirming your free consultation call for *${booking.service}* on *${booking.preferredDate}* at *${booking.preferredTime}*. Speak soon!`;
            const waHref = buildClientWhatsAppHref(booking.clientPhone, confirmMsg);

            return (
              <motion.article
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                className="luxury-card rounded-3xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-sm flex items-center justify-center shrink-0">
                        {getInitial(booking.clientName)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-sora text-base font-bold text-white truncate">
                          {booking.clientName}
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5 font-mono-tabular">
                          {booking.clientPhone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <p className="text-[11px] font-mono-tabular text-neutral-500 mt-1">
                        {formatTimeAgo(booking.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-3">
                      <p className="text-neutral-400 flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Date</span>
                      </p>
                      <p className="font-mono-tabular font-semibold text-white">
                        {booking.preferredDate}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-3">
                      <p className="text-neutral-400 flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Time</span>
                      </p>
                      <p className="font-mono-tabular font-semibold text-[#FFD700]">
                        {booking.preferredTime}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300">
                    Service: <strong className="text-white">{booking.service}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (booking.status === 'pending') {
                          void handleStatus(booking, 'confirmed');
                        }
                      }}
                      className="haptic-tap-sm min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/25 inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Confirm on WhatsApp</span>
                    </a>

                    <a
                      href={`tel:${booking.clientPhone}`}
                      className="haptic-tap-sm min-h-[38px] px-3 py-1.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy || booking.status === 'done'}
                      onClick={() => handleStatus(booking, 'done')}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-semibold text-emerald-300 disabled:opacity-45 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy || booking.status === 'cancelled'}
                      onClick={() => handleStatus(booking, 'cancelled')}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-medium text-neutral-300 hover:text-red-300 disabled:opacity-45 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      aria-label="Delete booking"
                      onClick={() => handleDelete(booking.id)}
                      className="min-h-[36px] min-w-[36px] rounded-xl border border-red-500/35 text-red-400 hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
};
