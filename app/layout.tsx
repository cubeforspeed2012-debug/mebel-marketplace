import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import Link from 'next/link'
import { Suspense } from 'react'
import { HeaderNav } from '@/components/header-nav'
import { InstallApp } from '@/components/install-app'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LocaleProvider } from '@/components/locale-provider'
import { RouteProgress } from '@/components/route-progress'
import { TabBar } from '@/components/tab-bar'
import type { Dict } from '@/lib/i18n'
import { getLocale } from '@/lib/locale'
import { getDict } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
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

// Тема светлая — иначе браузер с «тёмным режимом» перекрашивает сайт сам
export const viewport = {
  colorScheme: 'dark' as const,
  themeColor: '#0f0f0f',
}

export const metadata: Metadata = {
  title: {
    default: 'Mebel — мебель на заказ и готовая мебель в Ташкенте',
    template: '%s · Mebel',
  },
  description:
    'Каталог мебельных мастеров и фабрик Ташкента. Кухни, спальни, офисная и детская мебель — готовая и на заказ. Сравните работы и позвоните напрямую.',
  keywords: ['мебель Ташкент', 'мебель на заказ', 'кухни на заказ', 'mebel Toshkent'],
  applicationName: 'Mebel',
  appleWebApp: { capable: true, title: 'Mebel', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

function Header({ dict, signedIn }: { dict: Dict; signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-dark bg-ink">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="display text-lg text-on-dark">
          Mebel<span className="text-gold">.</span>
        </Link>

        <Suspense fallback={null}>
          <HeaderNav />
        </Suspense>

        <div className="ml-auto flex items-center gap-2">
          {/* Вошедшему звать регистрироваться незачем — ведём в его кабинет */}
          {signedIn ? (
            <Link
              href="/profile"
              className="hidden rounded-[var(--radius)] px-4 py-2 text-sm text-on-dark-muted transition-colors hover:text-on-dark sm:block"
            >
              {dict.nav.profile}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="hidden rounded-[var(--radius)] px-4 py-2 text-sm text-on-dark-muted transition-colors hover:text-on-dark sm:block"
              >
                {dict.nav.signIn}
              </Link>
              <Link
                href="/dashboard"
                className="press hidden whitespace-nowrap rounded-[var(--radius)] bg-gold px-3 py-2 text-[0.8125rem] font-semibold text-white transition-colors duration-200 hover:bg-gold-deep sm:block sm:px-4 sm:text-sm"
              >
                {dict.nav.postFurniture}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}

function Footer({ dict }: { dict: Dict }) {
  return (
    <footer className="border-t border-line-dark bg-ink text-on-dark-muted">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="display mb-3 text-lg text-on-dark">
              Mebel<span className="text-gold">.</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed">
              {dict.footer.about}
            </p>
          </div>

          <div>
            <div className="eyebrow mb-3 text-on-dark">{dict.footer.buyers}</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="transition-colors hover:text-on-dark">
                  {dict.footer.catalog}
                </Link>
              </li>
              <li>
                <Link href="/companies" className="transition-colors hover:text-on-dark">
                  {dict.footer.allMasters}
                </Link>
              </li>
              <li>
                <Link href="/auth?role=buyer" className="transition-colors hover:text-on-dark">
                  {dict.footer.account}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-on-dark">
                  {dict.footer.terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-on-dark">
                  {dict.footer.privacy}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3 text-on-dark">{dict.footer.masters}</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="transition-colors hover:text-on-dark">
                  {dict.footer.postFurniture}
                </Link>
              </li>
              <li>
                <Link href="/auth" className="transition-colors hover:text-on-dark">
                  {dict.footer.sellerSignIn}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-line-dark pt-6 text-sm">
          © {new Date().getFullYear()} Mebel · {dict.footer.city}
        </div>
      </div>
    </footer>
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const dict = getDict(locale)

  // Администратору в нижнем меню нужна кнопка панели управления,
  // а вошедшему человеку не нужны призывы зарегистрироваться
  let isAdmin = false
  let isSeller = false
  let signedIn = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    signedIn = Boolean(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      isAdmin = profile?.role === 'admin'

      // Кнопка «Мои работы» появляется, когда мастерская уже заведена:
      // раньше вести туда некуда — сначала профиль мастерской
      if (profile?.role === 'seller') {
        const { count } = await supabase
          .from('companies')
          .select('id', { count: 'exact', head: true })
          .eq('owner_user_id', user.id)
        isSeller = (count ?? 0) > 0
      }
    }
  } catch {
    isAdmin = false
    isSeller = false
    signedIn = false
  }

  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LocaleProvider dict={dict}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <Header dict={dict} signedIn={signedIn} />
          {/* Предложение поставить на домашний экран — там, где его видно сразу */}
          <InstallApp />
          <main className="animate-page flex-1">{children}</main>
          <Footer dict={dict} />

          {/* Нижнее меню на телефоне */}
          <Suspense fallback={null}>
            <TabBar isAdmin={isAdmin} isSeller={isSeller} />
          </Suspense>
        </LocaleProvider>
      </body>
    </html>
  )
}
