'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { GalleryUpload } from '@/components/gallery-upload'
import { PRODUCT_TYPES } from '@/lib/constants'
import type { Category, Product, ProductImage } from '@/lib/types'
import { saveProduct, type FormState } from './actions'

const EMPTY: FormState = {}

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
    <form action={action} className="space-y-6 rounded-[var(--radius)] border border-line bg-paper p-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <GalleryUpload value={images} onChange={setImages} />

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
            className="w-full rounded-[var(--radius)] border border-line bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
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
            defaultValue={product?.status ?? 'active'}
            className="w-full rounded-[var(--radius)] border border-line bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
          >
            <option value="active">Показывать</option>
            <option value="hidden">Спрятать</option>
            <option value="draft">Черновик</option>
          </select>
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
        <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
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
