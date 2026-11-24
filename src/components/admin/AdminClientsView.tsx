import React, { useMemo, useState } from 'react';
import {
  Mail,
  MessageCircle,
  Phone,
  Search,
  StickyNote,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ContactMessageRecord } from '../../types';
import {
  buildClientWhatsAppHref,
  deriveClientsFromMessages,
  formatTimeAgo,
  getInitial,
  getPipelineStageMeta,
  normalizePhoneKey,
} from './adminUtils';

interface AdminClientsViewProps {
  messages: ContactMessageRecord[];
  onFilterMessagesByClient: (queryText: string) => void;
}

export const AdminClientsView: React.FC<AdminClientsViewProps> = ({
  messages,
  onFilterMessagesByClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const clients = useMemo(() => deriveClientsFromMessages(messages), [messages]);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="luxury-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Client Directory
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
            Clients ({clients.length})
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Automatically built from your real client inquiries
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#D4AF37]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client name, phone..."
            className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700] mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <p className="font-luxury text-lg font-semibold text-white mb-2">
            No messages yet, CEO. Share your link.
          </p>
          <p className="text-xs text-neutral-400">
            Unique clients appear here automatically once prospects contact Aizer Tech.
          </p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="luxury-card rounded-3xl p-8 text-center">
          <p className="text-sm text-neutral-300">
            No clients matched &ldquo;{searchTerm}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredClients.map((client, idx) => {
            const phoneDigits = normalizePhoneKey(client.phone);
            const stageMeta = getPipelineStageMeta(client.lastStage);
            return (
              <motion.article
                key={client.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(idx * 0.03, 0.2) }}
                className="luxury-card luxury-card-hover rounded-3xl p-6 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-base flex items-center justify-center shrink-0">
                        {getInitial(client.name)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-sora text-base font-bold text-white truncate">
                          {client.name}
                        </h2>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {client.phone || client.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[11px] font-mono-tabular font-semibold text-[#FFD700]">
                        {client.messageCount}{' '}
                        {client.messageCount === 1 ? 'msg' : 'msgs'}
                      </span>
                      <p className="text-[11px] font-mono-tabular text-neutral-500 mt-1">
                        {formatTimeAgo(client.lastContactAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${stageMeta.badgeClass}`}>
                      {stageMeta.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] text-[#FFD700]">
                      {client.lastService}
                    </span>
                    <span className="font-mono-tabular text-[11px] text-neutral-400">
                      {client.lastBudget}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2 bg-white/[0.02] rounded-2xl p-3 border border-white/[0.06]">
                    {client.lastMessage}
                  </p>

                  {client.lastNote && (
                    <div className="mt-2.5 rounded-2xl bg-[#D4AF37]/8 border border-[#D4AF37]/25 p-2.5 flex items-start gap-2 text-xs text-[#F5D97D]">
                      <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{client.lastNote}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    {phoneDigits && (
                      <>
                        <a
                          href={buildClientWhatsAppHref(
                            client.phone,
                            `Hello ${client.name}, this is Sablaizer from Aizer Tech checking in on your ${client.lastService} project.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`tel:${client.phone}`}
                          className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/25"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </>
                    )}
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-neutral-300 hover:text-white"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onFilterMessagesByClient(client.phone || client.name)
                    }
                    className="text-xs font-semibold text-[#D4AF37] hover:text-[#FFD700] cursor-pointer py-2"
                  >
                    History ({client.messageCount}) →
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
};
