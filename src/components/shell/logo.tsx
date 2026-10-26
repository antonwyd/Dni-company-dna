export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative inline-flex size-8 items-center justify-center rounded-lg bg-ink text-[0.6875rem] font-bold tracking-[0.06em] text-paper"
      >
        DNI
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-shu ring-2 ring-paper" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-ink">Company DNA</span>
        {subtitle ? <span className="text-2xs text-ink-3">{subtitle}</span> : null}
      </span>
    </div>
  );
}
