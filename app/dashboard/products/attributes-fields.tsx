'use client'

import { CHOICE_GROUPS, type ChoiceKey, type ProductAttributes } from '@/lib/attributes'

/**
 * Характеристики работы в форме мастера.
 *
 * Это не анкета ради анкеты: по этим полям клиент находит работу через
 * поиск и фильтры. Поэтому объясняем это прямо в заголовке, а выбор
 * делаем в один тап — кнопки-варианты, а не выпадающие списки.
 */
export function AttributesFields({ value }: { value?: ProductAttributes | null }) {
  const a = value ?? {}

  return (
    <fieldset className="space-y-5 rounded-3xl border border-line bg-paper p-5">
      <div>
        <legend className="font-semibold text-text">Характеристики</legend>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          По ним клиенты находят вашу работу через поиск и фильтры: «кухня из МДФ в стиле лофт».
          Чем точнее заполнено, тем чаще работу открывают.
        </p>
      </div>

      {(Object.keys(CHOICE_GROUPS) as ChoiceKey[]).map((group) => (
        <div key={group}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
            {CHOICE_GROUPS[group].ru}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Пустой вариант нужен, чтобы можно было снять выбор */}
            <label className="cursor-pointer">
              <input type="radio" name={`attr_${group}`} value="" defaultChecked={!a[group]} className="peer sr-only" />
              <span className="block rounded-full border border-line px-3.5 py-2 text-sm text-text-muted transition-colors peer-checked:border-text peer-checked:text-text">
                Не важно
              </span>
            </label>
            {CHOICE_GROUPS[group].options.map((option) => (
              <label key={option.key} className="cursor-pointer">
                <input
                  type="radio"
                  name={`attr_${group}`}
                  value={option.key}
                  defaultChecked={a[group] === option.key}
                  className="peer sr-only"
                />
                <span className="block rounded-full border border-line px-3.5 py-2 text-sm transition-colors hover:border-gold peer-checked:border-gold peer-checked:bg-gold peer-checked:font-semibold peer-checked:text-white">
                  {option.ru}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Размеры, см
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['width_cm', 'Ширина'],
              ['height_cm', 'Высота'],
              ['depth_cm', 'Глубина'],
            ] as const
          ).map(([key, title]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs text-text-muted">{title}</span>
              <input
                name={`attr_${key}`}
                inputMode="numeric"
                defaultValue={a[key] ?? ''}
                placeholder="—"
                className="w-full rounded-[var(--radius)] border border-line px-3 py-2.5 outline-none transition-colors focus:border-gold"
              />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          Для мебели на заказ — размеры показанной работы. Клиент поймёт масштаб.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Срок изготовления, дней
          </span>
          <input
            name="attr_made_days"
            inputMode="numeric"
            defaultValue={a.made_days ?? ''}
            placeholder="14"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
          />
        </label>

        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="attr_delivery" defaultChecked={Boolean(a.delivery)} className="size-4 accent-[var(--gold)]" />
            Доставка по Ташкенту
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="attr_installation" defaultChecked={Boolean(a.installation)} className="size-4 accent-[var(--gold)]" />
            Установка и сборка
          </label>
        </div>
      </div>
    </fieldset>
  )
}
