import Link from 'next/link'
import { ScreenHeader } from '@/components/settings-list'

export const metadata = { title: 'Помощь и связь' }

const FAQ = [
  {
    q: 'Как попасть в каталог?',
    a: 'Заполните мастерскую в профиле: название, телефон, район и чем занимаетесь. Администратор проверит её — обычно в течение дня — и откроет вас в каталоге.',
  },
  {
    q: 'Почему мою работу не видно?',
    a: 'Каждая новая работа проходит проверку — в кабинете у неё статус «На проверке», обычно это занимает день. После одобрения она появится в каталоге. Если поменять название, цену, описание или фото, работа снова уйдёт на проверку.',
  },
  {
    q: 'Кто берёт деньги за заказ?',
    a: 'Никто, кроме вас. Площадка не участвует в сделке и не берёт комиссию с заказов. Покупатель платит мастеру напрямую.',
  },
  {
    q: 'Как поднять свои работы выше?',
    a: 'В кабинете есть «Продвижение»: оплаченное поднятие ставит вашу мебель выше других на несколько часов или дней.',
  },
  {
    q: 'Забыл пароль',
    a: 'На странице входа нажмите «Забыли пароль?» — придёт письмо со ссылкой. Или входите по коду из письма.',
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-10">
      <ScreenHeader title="Помощь и связь" />

      <div className="space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-3xl bg-paper p-5">
            <summary className="cursor-pointer list-none font-semibold text-text marker:hidden">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">{item.a}</p>
          </details>
        ))}
      </div>

      <section className="mt-5 rounded-3xl bg-paper p-5">
        <h2 className="font-semibold text-text">Не нашли ответ?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
          Напишите администратору площадки — разберёмся.
        </p>
        <Link
          href="/support"
          className="press mt-4 block rounded-2xl bg-gold py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Написать в поддержку
        </Link>
      </section>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-text-muted">
        <Link href="/terms" className="hover:text-text">
          Условия
        </Link>
        <Link href="/privacy" className="hover:text-text">
          Конфиденциальность
        </Link>
      </div>
    </div>
  )
}
