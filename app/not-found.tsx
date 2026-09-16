import Link from 'next/link'
import { FurnitureScene } from '@/components/furniture-icons'

/**
 * Страница не нашлась. Раньше здесь показывался голый системный экран
 * с надписью на английском — человек думал, что сайт сломался.
 * Теперь это обычная страница сайта, с которой есть куда уйти.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <FurnitureScene className="h-28 w-auto opacity-70" />

      <h1 className="display mt-8 text-2xl text-text">Такой страницы нет</h1>

      <p className="mt-3 leading-relaxed text-text-muted">
        Возможно, мастер снял объявление или в ссылке опечатка.
        Посмотрите каталог — там вся мебель, которая есть сейчас.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/catalog"
          className="press rounded-full bg-gold px-7 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          В каталог
        </Link>
        <Link
          href="/"
          className="press rounded-full border border-line px-7 py-3 font-semibold text-text transition-colors hover:border-gold"
        >
          На главную
        </Link>
      </div>
    </div>
  )
}
