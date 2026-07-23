import Link from 'next/link';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-charcoal-100 bg-white text-charcoal-600">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-charcoal-600">
              Türkiye'nin okul servisi bulma platformu. Onaylı servisçilerden
              teklifleri karşılaştırın, güvenle seçin.
            </p>
            <div className="mt-6 flex gap-3">
              <Social href="#" label="Facebook">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.99 22 12z" />
              </Social>
              <Social href="#" label="Instagram">
                <path d="M12 2.163c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </Social>
              <Social href="#" label="X">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </Social>
              <Social href="#" label="LinkedIn">
                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.339 18.339V9.667H5.667v8.672h2.672zM7.003 8.5a1.548 1.548 0 100-3.096 1.548 1.548 0 000 3.096zm11.336 9.839v-4.75c0-2.579-1.379-3.779-3.219-3.779-1.485 0-2.15.816-2.52 1.39V9.667h-2.671c.035.754 0 8.672 0 8.672h2.671v-4.844c0-.24.017-.48.088-.652.192-.48.633-.977 1.371-.977.968 0 1.354.737 1.354 1.819v4.654h2.926z" />
              </Social>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-charcoal-900">
              Platform
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <FooterLink href="/#nasil-calisir">Nasıl Çalışır</FooterLink>
              <FooterLink href="/teklif-al">Teklif Al</FooterLink>
              <FooterLink href="/#servisci">Servisçilere</FooterLink>
              <FooterLink href="/#sss">SSS</FooterLink>
              <FooterLink href="/servisci/kayit">Servisçi Kaydı</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-charcoal-900">
              Kurumsal
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <FooterLink href="/hakkimizda">Hakkımızda</FooterLink>
              <FooterLink href="/iletisim">İletişim</FooterLink>
              <FooterLink href="/gizlilik">Gizlilik Politikası</FooterLink>
              <FooterLink href="/kullanim-kosullari">Kullanım Koşulları</FooterLink>
              <FooterLink href="/kvkk">KVKK Aydınlatma</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-charcoal-900">
              İletişim
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 flex-none text-sunset-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Altınordu, Ordu</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 flex-none text-sunset-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+904523000000" className="hover:text-charcoal-900">
                  +90 452 300 00 00
                </a>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 flex-none text-sunset-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:destek@servisplatform.com" className="hover:text-charcoal-900">
                  destek@servisplatform.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 flex-none text-sunset-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Hafta içi 09:00 – 18:00</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-charcoal-100 pt-8 md:flex-row">
          <div className="text-xs text-charcoal-500">
            © {new Date().getFullYear()} Servis Platform. Tüm hakları saklıdır.
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-charcoal-500">
            <Link href="/veli/giris" className="hover:text-charcoal-900">
              Veli Girişi
            </Link>
            <Link href="/servisci/giris" className="hover:text-charcoal-900">
              Servisçi Girişi
            </Link>
            <Link href="/admin/giris" className="hover:text-charcoal-900">
              Yönetici
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-charcoal-600 hover:text-charcoal-900">
        {children}
      </Link>
    </li>
  );
}

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-charcoal-700 transition hover:bg-sunset-500 hover:text-white"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        {children}
      </svg>
    </a>
  );
}
