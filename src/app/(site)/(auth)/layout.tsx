export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(243,194,198,0.10),transparent_70%)]" />
      <div className="container-page relative flex justify-center py-12 sm:py-20">{children}</div>
    </div>
  );
}
