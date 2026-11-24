import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { RegisteredUserRecord } from '../../types';
import {
  buildClientWhatsAppHref,
  formatFullDateTime,
  formatTimeAgo,
  getInitial,
  getTimestampMs,
  normalizePhoneKey,
} from './adminUtils';

interface AdminRegisteredUsersViewProps {
  users: RegisteredUserRecord[];
  loadingUsers: boolean;
  onFilterMessagesByUser: (queryText: string) => void;
}

export const AdminRegisteredUsersView: React.FC<AdminRegisteredUsersViewProps> = ({
  users,
  loadingUsers,
  onFilterMessagesByUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const sorted = [...users].sort(
      (a, b) => getTimestampMs(b.lastActiveAt) - getTimestampMs(a.lastActiveAt)
    );
    if (!q) return sorted;
    return sorted.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const totalRequests = useMemo(
    () => users.reduce((sum, u) => sum + (Number(u.totalRequests) || 0), 0),
    [users]
  );

  return (
    <div className="space-y-6">
      <div className="luxury-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Verified Google Accounts
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1 flex items-center gap-3">
            <span>Registered Users ({users.length})</span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FFD700]">
              <UserCheck className="w-4 h-4" />
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {totalRequests} total project &amp; call requests submitted by logged-in users
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#D4AF37]/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {loadingUsers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-44 rounded-3xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <Users className="w-8 h-8 text-[#D4AF37] mx-auto mb-3 opacity-80" />
          <p className="font-luxury text-lg font-semibold text-white mb-2">
            {users.length === 0
              ? 'No registered users yet.'
              : 'No registered users match your search.'}
          </p>
          <p className="text-xs text-neutral-400">
            Visitors who sign in with Google to chat, request quotes, or book calls appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredUsers.map((u) => {
            const hasPhone = normalizePhoneKey(u.phone).length >= 7;
            return (
              <article
                key={u.uid}
                className="luxury-card luxury-card-hover rounded-3xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {u.photoUrl ? (
                      <img
                        src={u.photoUrl}
                        alt={u.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-[#D4AF37]/50 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-base flex items-center justify-center shrink-0">
                        {getInitial(u.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="font-sora text-base font-bold text-white truncate">
                        {u.name}
                      </h2>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {u.email}
                      </p>
                      <p className="text-xs font-mono-tabular text-[#FFD700] mt-1 inline-flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>{u.phone || 'Phone not added yet'}</span>
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 font-mono-tabular text-[11px] font-bold text-[#FFD700] shrink-0">
                    {u.totalRequests} {u.totalRequests === 1 ? 'request' : 'requests'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                  <div>
                    <p className="text-neutral-400">First Login</p>
                    <p className="font-mono-tabular text-neutral-200 font-medium mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#D4AF37] shrink-0" />
                      <span className="truncate">{formatFullDateTime(u.firstLoginAt)}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Last Active</p>
                    <p className="font-mono-tabular text-emerald-300 font-medium mt-0.5">
                      {formatTimeAgo(u.lastActiveAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    {hasPhone && (
                      <a
                        href={buildClientWhatsAppHref(
                          u.phone,
                          `Hello ${u.name}, greetings from Sablaizer at AizerTech GH.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="haptic-tap-sm min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {u.email && (
                      <a
                        href={`mailto:${u.email}`}
                        className="haptic-tap-sm min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-white hover:border-[#D4AF37]/50"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onFilterMessagesByUser(u.email || u.name)}
                    className="haptic-tap-sm text-xs font-semibold text-[#FFD700] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Requests</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
