import { TgInit } from '@/components/tg-init'
import { TgTabs } from '@/components/tg-tabs'

/**
 * Каркас мини-приложения: два экрана и полоска переключения внизу.
 * Шапку и подвал сайта сюда не пускаем — у окна Telegram своя рамка.
 */
export default function TgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream pb-20">
      <TgInit />
      {children}
      <TgTabs />
    </div>
  )
}
