import React from 'react';

export default function StatsCard({ title, value, icon, color = 'brand', subtitle, trend }) {
  const colors = {
    brand: 'from-sk-primary to-sk-bright text-white shadow-sk-primary/30',
    green: 'from-emerald-500 to-emerald-400 text-white shadow-emerald-500/30',
    amber: 'from-amber-500 to-amber-400 text-white shadow-amber-500/30',
    red: 'from-rose-500 to-rose-400 text-white shadow-rose-500/30',
    purple: 'from-violet-500 to-violet-400 text-white shadow-violet-500/30',
    blue: 'from-sky-500 to-sky-400 text-white shadow-sky-500/30',
  };
  return (
    <div className="card group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-sk-muted">{title}</p>
          <p className="mt-1.5 truncate font-display text-[28px] font-extrabold tracking-tight text-sk-ink">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-sk-outline">{subtitle}</p>}
        </div>
        {icon && (
          <span className={`rounded-2xl bg-gradient-to-br p-3 shadow-lg transition-transform duration-300 group-hover:scale-110 ${colors[color] || colors.brand}`}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
            </svg>
          </span>
        )}
      </div>
      {trend && (
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {trend}
        </p>
      )}
    </div>
  );
}
