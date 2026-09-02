import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
})

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: 'Mebel — мебель на заказ и готовая мебель в Ташкенте',
    template: '%s · Mebel',
  },
  description:
    'Каталог мебельных мастеров и фабрик Ташкента. Кухни, спальни, офисная и детская мебель — готовая и на заказ. Сравните работы и позвоните напрямую.',
  keywords: ['мебель Ташкент', 'мебель на заказ', 'кухни на заказ', 'mebel Toshkent'],
}

const NAV = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/catalog?type=custom_order', label: 'На заказ' },
  { href: '/companies', label: 'Мастера' },
]

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line-dark bg-ink-deep">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="display text-lg text-on-dark">
          Mebel<span className="text-gold">.</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-on-dark-muted sm:flex">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href} className="transition-colors hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/dashboard"
          className="ml-auto rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-on-dark"
        >
          Разместить мебель
        </Link>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-ink-deep text-on-dark-muted">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="display mb-3 text-lg text-on-dark">
              Mebel<span className="text-gold">.</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed">
              Площадка мебельных мастеров и фабрик Ташкента. Находите, сравнивайте,
              звоните напрямую — без посредников.
            </p>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
              Покупателям
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="transition-colors hover:text-on-dark">
                  Каталог мебели
                </Link>
              </li>
              <li>
                <Link href="/companies" className="transition-colors hover:text-on-dark">
                  Все мастера
                </Link>
              </li>
              <li>
                <Link href="/auth?role=buyer" className="transition-colors hover:text-on-dark">
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-on-dark">
                  Условия
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
              Мастерам
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="transition-colors hover:text-on-dark">
                  Разместить мебель
                </Link>
              </li>
              <li>
                <Link href="/auth" className="transition-colors hover:text-on-dark">
                  Вход для продавцов
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-line-dark pt-6 text-sm">
          © {new Date().getFullYear()} Mebel · Ташкент
        </div>
      </div>
    </footer>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
