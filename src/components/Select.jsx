import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Themed dropdown that replaces the native <select> (whose open list can't be
 * styled). Keyboard: ↑/↓ move, Enter/Space select, Esc close, type-ahead.
 *
 * props:
 *   value        current value
 *   onChange     (value) => void
 *   options      [{ value, label, hint?, disabled? }]   label may be a string or node
 *   placeholder  shown when nothing matches value
 *   disabled
 *   className    extra classes on the trigger button
 *   buttonClassName  full override for the trigger classes
 */
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  className = '',
  buttonClassName,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // keyboard-highlighted index
  const [drop, setDrop] = useState('down'); // 'down' | 'up'
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const typeBuf = useRef({ str: '', t: 0 });
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const r = rootRef.current?.getBoundingClientRect();
    if (r) setDrop(window.innerHeight - r.bottom < 260 && r.top > 260 ? 'up' : 'down');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && active >= 0) {
      listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  const commit = (i) => {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    onChange?.(opt.value);
    setOpen(false);
  };

  const move = (dir) => {
    setActive((cur) => {
      let n = cur;
      for (let k = 0; k < options.length; k++) {
        n = (n + dir + options.length) % options.length;
        if (!options[n]?.disabled) return n;
      }
      return cur;
    });
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault(); setOpen(true); return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(active); }
    else if (e.key.length === 1) {
      const now = Date.now();
      typeBuf.current.str = now - typeBuf.current.t > 700 ? e.key : typeBuf.current.str + e.key;
      typeBuf.current.t = now;
      const q = typeBuf.current.str.toLowerCase();
      const hit = options.findIndex((o) => String(o.label).toLowerCase().startsWith(q));
      if (hit >= 0) setActive(hit);
    }
  };

  const triggerCls = buttonClassName ?? (
    `w-full flex items-center justify-between gap-2 bg-slate-50/50 border rounded-xl px-3.5 py-2.5 text-xs font-bold text-left transition-colors ${
      disabled ? 'opacity-60 cursor-not-allowed text-slate-400 border-slate-200'
        : `cursor-pointer text-slate-800 ${open ? 'border-[#ea580c] ring-2 ring-[#fdba74]/50' : 'border-slate-200 hover:border-slate-300'}`
    } ${className}`
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={triggerCls}
      >
        <span className="truncate">{selected ? selected.label : <span className="text-slate-400">{placeholder}</span>}</span>
        <ChevronDown className={`w-4 h-4 text-purple-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={`absolute z-50 left-0 right-0 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-100 ${
            drop === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {options.map((o, i) => {
            const isSel = o.value === value;
            const isActive = i === active;
            return (
              <li
                key={o.value ?? i}
                data-i={i}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none ${
                  o.disabled ? 'text-slate-300 cursor-not-allowed'
                    : isActive ? 'bg-[#3b0764] text-white'
                    : isSel ? 'bg-orange-50 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">
                  {o.label}
                  {o.hint && <span className={`ml-1.5 font-mono ${isActive ? 'text-white/60' : 'text-slate-400'}`}>{o.hint}</span>}
                </span>
                {isSel && <Check className={`w-3.5 h-3.5 shrink-0 stroke-3 ${isActive ? 'text-white' : 'text-[#ea580c]'}`} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
