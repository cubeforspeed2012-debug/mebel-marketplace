'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { PhotoPicker } from '@/components/photo-picker'
import { PRODUCT_TYPES } from '@/lib/constants'
import type { Category, Product, ProductImage } from '@/lib/types'
import { saveProduct, type FormState } from './actions'

const EMPTY: FormState = {}


/** Что нужно, чтобы работа прошла проверку с первого раза. */
function Rules({ editing }: { editing: boolean }) {
  return (
    <div className="rounded-3xl border border-line bg-cream p-5">
      <div className="font-semibold text-text">
        {editing ? 'После изменений работа снова пройдёт проверку' : 'Работа пройдёт проверку'}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
        Сначала её смотрит автоматическая проверка — обычно это занимает несколько секунд.
        Спорное уходит администратору, это до одного дня.
      </p>

      <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Пройдёт сразу
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-text">
        <li>· Свои фотографии готовой работы — хотя бы одна, лучше несколько</li>
        <li>· Понятное название: «Кухня под ваш размер», «Шкаф-купе в нишу»</li>
        <li>· Настоящая цена. Пишите полностью: 4 500 000, а не 4500</li>
        <li>· Описание своими словами. Коротко — тоже нормально</li>
      </ul>

      <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-status-error">
        Не пройдёт
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-text">
        <li>· Без фотографий</li>
        <li>· Телефон, Telegram, Instagram или ссылка в тексте — клиенты и так видят ваш номер кнопкой «Показать номер»</li>
        <li>· НАЗВАНИЕ ЗАГЛАВНЫМИ и «Дёшево!!!»</li>
        <li>· Чужие фотографии из интернета</li>
        <li>· Не мебель</li>
      </ul>

      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-text-muted">
        Первые две работы новой мастерской смотрит человек, даже если замечаний нет.
        Дальше ваши работы проходят проверку сами и появляются в каталоге почти сразу.
      </p>
    </div>
  )
}

export function ProductForm({
  product,
  images: initialImages,
  categories,
}: {
  product?: Product | null
  images?: ProductImage[]
  categories: Category[]
}) {
  const [state, action, pending] = useActionState(saveProduct, EMPTY)
  const [images, setImages] = useState<string[]>(
    (initialImages ?? []).sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url),
  )

  return (
    <form action={action} className="space-y-6 rounded-3xl bg-paper p-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/*
        Правила до отправки, а не после отказа.
        Мастер, узнавший про них из отклонённой работы, считает, что
        площадка к нему придирается. Тот же человек, прочитавший их
        заранее, просто делает как надо — и работа проходит с первого раза.
        Поэтому список открыт сразу и написан как подсказка, а не как угроза.
      */}
      <Rules editing={Boolean(product)} />

      <PhotoPicker saved={images} onChangeSaved={setImages} />

      {images.length === 0 && (
        <p className="rounded-2xl bg-status-process/15 px-4 py-3 text-sm text-status-process">
          Без фото карточку почти никто не открывает. Добавьте хотя бы одну — лучше готовую
          работу у клиента дома.
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Название
        </span>
        <input
          name="title"
          required
          defaultValue={product?.title ?? ''}
          placeholder="Например: Кухня из массива дуба"
          className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Категория
          </span>
          <select
            name="category_id"
            defaultValue={product?.category_id ?? ''}
            className="w-full rounded-3xl bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
          >
            <option value="">Не выбрана</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
            Тип
          </legend>
          <div className="flex gap-2">
            {Object.entries(PRODUCT_TYPES).map(([value, label]) => (
              <label key={value} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={value}
                  defaultChecked={(product?.type ?? 'ready_made') === value}
                  className="peer sr-only"
                />
                <span className="block border border-line px-4 py-2.5 text-center text-sm transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:font-semibold peer-checked:text-white">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Цена, сум
          </span>
          <input
            name="price"
            inputMode="numeric"
            defaultValue={product?.price ?? ''}
            placeholder="12000000"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="price_from"
              defaultChecked={product?.price_from ?? true}
              className="size-4 accent-[var(--gold)]"
            />
            Показывать как «от» — для мебели на заказ
          </label>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Показ в каталоге
          </span>
          <select
            name="status"
            defaultValue={product?.status === 'pending' ? 'active' : (product?.status ?? 'active')}
            className="w-full rounded-3xl bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
          >
            <option value="active">Показывать</option>
            <option value="hidden">Спрятать</option>
            <option value="draft">Черновик</option>
          </select>
          {/*
            Честно предупреждаем, что «Показывать» не значит «сразу в каталоге».
            Без этой строки мастер сохранит работу, не найдёт её в каталоге
            и решит, что сайт сломался.
          */}
          <span className="mt-1.5 block text-xs leading-relaxed text-text-muted">
            {product?.moderated
              ? 'Если поменять название, цену, описание или фото — работа снова уйдёт на проверку.'
              : 'Новая работа появится в каталоге после проверки. Обычно это занимает день.'}
          </span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Описание
        </span>
        <textarea
          name="description"
          rows={5}
          defaultValue={product?.description ?? ''}
          placeholder="Материалы, размеры, сроки изготовления, что входит в цену"
          className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      {state.error && (
        <p className="border border-[#b91c1c]/40 bg-[#b91c1c]/15 px-3 py-2 text-sm text-status-error">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-gold px-7 py-3 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
        >
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <Link
          href="/dashboard/products"
          className="border border-line px-7 py-3 font-semibold text-text-muted transition-colors hover:border-gold hover:text-text"
        >
          Отмена
        </Link>
      </div>
    </form>
  )
}
