export function AuthCard({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-border bg-surface/80 p-6 shadow-2xl sm:p-10`}>
      <h1 className="font-display text-3xl text-white">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      <div className="gold-hairline my-6" />
      {children}
    </div>
  );
}
