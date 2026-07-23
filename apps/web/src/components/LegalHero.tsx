export function LegalHero({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-white py-16">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 right-1/4 h-64 w-96 rounded-full bg-sunset-100 blur-3xl opacity-60" />
      </div>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center rounded-full bg-sunset-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sunset-700">
          {badge}
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-charcoal-900 md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal-600">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
