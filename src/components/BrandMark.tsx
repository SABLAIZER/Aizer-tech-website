import React, { useState } from 'react';
import { AIZER_LOGO_URL } from '../types';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 'sm' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'lg'
      ? 'w-11 h-11 rounded-xl'
      : size === 'md'
      ? 'w-9 h-9 rounded-lg'
      : 'w-8 h-8 rounded-lg';

  if (imgFailed) {
    return (
      <span
        aria-hidden="true"
        className={`${dims} bg-[#070708] border border-accent/50 inline-flex items-center justify-center shrink-0 shadow-sm`}
      >
        <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
          <path
            d="M16 4L5 27h4.2l2.4-5.2h8.8L22.8 27H27L16 4zm-2.6 14L16 11.8 18.6 18h-5.2z"
            fill="#D4A853"
          />
          <path
            d="M11 26L23 6"
            stroke="#F4F3EF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={AIZER_LOGO_URL}
      alt="Aizer Tech emblem"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${dims} object-cover border border-accent/45 shrink-0 shadow-sm bg-[#070708]`}
    />
  );
};
