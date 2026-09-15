import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Inter, Manrope } from 'next/font/google'
import Link from 'next/link'
import { Suspense } from 'react'
import { HeaderNav } from '@/components/header-nav'
import { InstallApp } from '@/components/install-app'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LocaleProvider } from '@/components/locale-provider'
import { RouteProgress } from '@/components/route-progress'
import { ThemeToggle } from '@/components/theme-toggle'
import { TabBar } from '@/components/tab-bar'
import type { Dict } from '@/lib/i18n'
import { getLocale } from '@/lib/locale'
import { getDict } from '@/lib/i18n'
import { SITE_URL } from '@/lib/constants'
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
  colorScheme: 'light' as const,
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  // Без этого ссылка, отправленная в Telegram, приходит без картинки:
  // относительные адреса мессенджеры не понимают.
  metadataBase: new URL(SITE_URL),
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
  // Как выглядит ссылка, когда мастер кидает её клиенту в Telegram
  openGraph: {
    type: 'website',
    siteName: 'Mebel',
    locale: 'ru_RU',
    url: SITE_URL,
    title: 'Mebel — мебель на заказ и готовая мебель в Ташкенте',
    description:
      'Каталог мебельных мастеров и фабрик Ташкента. Кухни, спальни, офисная и детская мебель — готовая и на заказ.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Mebel' }],
  },
  alternates: { canonical: '/' },
}

function Header({
  dict,
  signedIn,
  theme,
}: {
  dict: Dict
  signedIn: boolean
  theme: 'dark' | 'light'
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="display text-lg text-text">
          Mebel<span className="text-gold">.</span>
        </Link>

        <Suspense fallback={null}>
          <HeaderNav />
        </Suspense>

        <div className="ml-auto flex items-center gap-2">
          {/* Вошедшему звать регистрироваться незачем — ведём в его кабинет */}
          {signedIn ? (
            <Link
              href="/catalog"
              className="press rounded-full bg-sand px-4 py-2 text-sm text-text transition-colors hover:bg-gold-soft md:hidden"
            >
              {dict.nav.catalog}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="hidden rounded-full px-4 py-2 text-sm text-text-muted transition-colors hover:text-text sm:block"
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
          <ThemeToggle initial={theme} />
        </div>
      </div>
    </header>
  )
}

function Footer({ dict }: { dict: Dict }) {
  return (
    <footer className="border-t border-line bg-ink-deep text-text-muted">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="display mb-3 text-lg text-text">
              Mebel<span className="text-gold">.</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed">
              {dict.footer.about}
            </p>
          </div>

          <div>
            <div className="eyebrow mb-3 text-text">{dict.footer.buyers}</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="transition-colors hover:text-text">
                  {dict.footer.catalog}
                </Link>
              </li>
              <li>
                <Link href="/companies" className="transition-colors hover:text-text">
                  {dict.footer.allMasters}
                </Link>
              </li>
              <li>
                <Link href="/auth?role=buyer" className="transition-colors hover:text-text">
                  {dict.footer.account}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-text">
                  {dict.footer.terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-text">
                  {dict.footer.privacy}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3 text-text">{dict.footer.masters}</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="transition-colors hover:text-text">
                  {dict.footer.postFurniture}
                </Link>
              </li>
              <li>
                <Link href="/auth" className="transition-colors hover:text-text">
                  {dict.footer.sellerSignIn}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-6 text-sm">
          © {new Date().getFullYear()} Mebel · {dict.footer.city}
        </div>
      </div>
    </footer>
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const dict = getDict(locale)

  // Тема из куки — страница сразу приходит в нужном цвете, без мигания
  let theme: 'dark' | 'light' = 'light'
  try {
    const store = await cookies()
    if (store.get('theme')?.value === 'dark') theme = 'dark'
  } catch {
    theme = 'light'
  }

  // Администратору в нижнем меню нужна кнопка панели управления,
  // а вошедшему человеку не нужны призывы зарегистрироваться
  let isAdmin = false
  let isSeller = false
  let signedIn = false
  let role: 'guest' | 'buyer' | 'seller' | 'admin' = 'guest'
  let newOrders = 0
  let pending = 0
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
      role = profile?.role === 'admin' ? 'admin' : profile?.role === 'seller' ? 'seller' : 'buyer'

      // Кнопка «Мои работы» появляется, когда мастерская уже заведена:
      // раньше вести туда некуда — сначала профиль мастерской
      if (profile?.role === 'seller') {
        const { data: own } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_user_id', user.id)
          .limit(1)
        const companyId = own?.[0]?.id
        isSeller = Boolean(companyId)

        // Цифра новых заказов — прямо на значке в нижнем меню
        if (companyId) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'new')
          newOrders = count ?? 0
        }
      }

      // Сколько мастерских ждут решения — видно с любой страницы
      if (isAdmin) {
        const { count } = await supabase
          .from('companies')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
        pending = count ?? 0
      }
    }
  } catch {
    isAdmin = false
    isSeller = false
    signedIn = false
    role = 'guest'
    newOrders = 0
    pending = 0
  }

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      {/* Отступ снизу — под нижнее меню: оно висит поверх и иначе закрыло бы подвал */}
      <body className="flex min-h-full flex-col font-sans pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <LocaleProvider dict={dict}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <Header dict={dict} signedIn={signedIn} theme={theme} />
          {/* Предложение поставить на домашний экран — там, где его видно сразу */}
          <InstallApp />
          <main className="animate-page flex-1">{children}</main>
          <Footer dict={dict} />

          {/* Нижнее меню — на каждой странице, и на телефоне, и на компьютере */}
          <Suspense fallback={null}>
            {/* Мастер без мастерской видит меню покупателя: его разделов ещё нет */}
            <TabBar
              role={role === 'seller' && !isSeller ? 'buyer' : role}
              newOrders={newOrders}
              pending={pending}
            />
          </Suspense>
        </LocaleProvider>
      </body>
    </html>
  )
}
