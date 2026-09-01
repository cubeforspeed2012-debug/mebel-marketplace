import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
})

export const metadata: Metadata = {
  title: {
    default: 'Mebel — мебель на заказ и готовая мебель в Ташкенте',
    template: '%s · Mebel',
  },
  description:
    'Каталог мебельных мастеров и фабрик Ташкента. Кухни, спальни, офисная и детская мебель — готовая и на заказ. Сравните мастеров и позвоните напрямую.',
  keywords: ['мебель Ташкент', 'мебель на заказ', 'кухни на заказ', 'mebel Toshkent'],
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Mebel<span className="text-accent">.</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-muted sm:flex">
          <Link href="/catalog" className="transition-colors hover:text-foreground">
            Каталог
          </Link>
          <Link href="/catalog?type=custom_order" className="transition-colors hover:text-foreground">
            На заказ
          </Link>
          <Link href="/companies" className="transition-colors hover:text-foreground">
            Мастера
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Разместить мебель
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <div className="min-w-50">
            <div className="mb-2 font-semibold text-foreground">Mebel</div>
            <p className="max-w-xs leading-relaxed">
              Площадка мебельных мастеров и фабрик Ташкента. Находите, сравнивайте,
              звоните напрямую — без посредников.
            </p>
          </div>
          <div>
            <div className="mb-2 font-medium text-foreground">Покупателям</div>
            <ul className="space-y-1">
              <li>
                <Link href="/catalog" className="hover:text-foreground">
                  Каталог мебели
                </Link>
              </li>
              <li>
                <Link href="/companies" className="hover:text-foreground">
                  Все мастера
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-medium text-foreground">Мастерам</div>
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  Разместить мебель
                </Link>
              </li>
              <li>
                <Link href="/auth" className="hover:text-foreground">
                  Вход для продавцов
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6">
          © {new Date().getFullYear()} Mebel · Ташкент
        </div>
      </div>
    </footer>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
