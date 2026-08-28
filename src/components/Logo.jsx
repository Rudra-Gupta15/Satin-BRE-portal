import { useState } from 'react';

/**
 * Satin Finserv Limited brand logo.
 * Drops in the real asset from /public/sfl-logo.png; if that file is missing
 * it falls back to a styled text badge so the UI never breaks.
 */
export default function Logo({ className = '', imgClassName = '', showWordmark = true }) {
  const [imgOk, setImgOk] = useState(true);

  if (imgOk) {
    return (
      <img
        src="/logo.png"
        alt="Satin Finserv Limited"
        className={`object-contain ${imgClassName || 'h-10 w-auto'} ${className}`}
        onError={() => setImgOk(false)}
      />
    );
  }

  // Fallback: text badge
  return (
    <div className={`text-center leading-none ${className}`}>
      <span className="block text-2xl font-black italic tracking-wider bg-linear-to-r from-[#5b2d90] via-[#e63329] to-[#f5a623] bg-clip-text text-transparent">
        SFL
      </span>
      {showWordmark && (
        <span className="mt-0.5 block text-[10px] font-bold italic tracking-tight text-[#5b2d90]">
          Satin Finserv Limited
        </span>
      )}
    </div>
  );
}
