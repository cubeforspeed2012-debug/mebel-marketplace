'use client'

import { useEffect, useRef, useState } from 'react'
import { IconPhotos } from '@/components/ui-icons'

const MAX_PHOTOS = 12
const MAX_MB = 5

type Picked = { file: File; preview: string }

/**
 * Выбор фотографий работы.
 *
 * Один способ вместо двух: человек нажимает «Добавить фото», выбирает
 * снимки — и сразу видит их здесь же. Сами файлы остаются в поле формы
 * и уходят на сервер при нажатии «Сохранить»: так работает на любом
 * телефоне, в отличие от загрузки прямо из браузера.
 */
export function PhotoPicker({
  saved,
  onChangeSaved,
}: {
  saved: string[]
  onChangeSaved: (urls: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [error, setError] = useState<string | null>(null)

  // Ссылки на предпросмотр держат файл в памяти — отпускаем их за собой
  useEffect(() => {
    return () => picked.forEach((item) => URL.revokeObjectURL(item.preview))
  }, [picked])

  const total = saved.length + picked.length

  /** Складываем выбранное обратно в поле формы, иначе на сервер уйдёт только последний выбор. */
  function syncInput(next: Picked[]) {
    if (!inputRef.current) return

    const bag = new DataTransfer()
    next.forEach((item) => bag.items.add(item.file))
    inputRef.current.files = bag.files
  }

  function add(files: FileList) {
    setError(null)

    const room = MAX_PHOTOS - total
    if (room <= 0) {
      setError(`Больше ${MAX_PHOTOS} фото не нужно`)
      return
    }

    const accepted: Picked[] = []

    for (const file of Array.from(files).slice(0, room)) {
      // Телефоны иногда не проставляют тип файла — смотрим и на расширение
      const looksLikeImage =
        file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)

      if (!looksLikeImage) {
        setError(`«${file.name}» — не фотография`)
        continue
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`«${file.name}» больше ${MAX_MB} МБ`)
        continue
      }

      accepted.push({ file, preview: URL.createObjectURL(file) })
    }

    if (accepted.length === 0) return

    const next = [...picked, ...accepted]
    setPicked(next)
    syncInput(next)
  }

  function removePicked(index: number) {
    const next = picked.filter((_, i) => i !== index)
    URL.revokeObjectURL(picked[index].preview)
    setPicked(next)
    syncInput(next)
  }

  function moveSaved(index: number, direction: -1 | 1) {
    const next = [...saved]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChangeSaved(next)
  }

  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        Фото работы
      </span>

      {total > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {/* Уже сохранённые: их можно переставить и удалить */}
          {saved.map((url, index) => (
            <div key={url} className="relative overflow-hidden rounded-2xl border border-line bg-cream">
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>

              {index === 0 && (
                <span className="absolute left-0 top-0 rounded-br-xl bg-gold px-2 py-0.5 text-xs font-semibold text-white">
                  Обложка
                </span>
              )}

              <div className="flex border-t border-line text-xs">
                <button
                  type="button"
                  onClick={() => moveSaved(index, -1)}
                  disabled={index === 0}
                  aria-label="Левее"
                  className="flex-1 py-1.5 transition-colors hover:bg-sand disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSaved(saved.filter((u) => u !== url))}
                  aria-label="Удалить фото"
                  className="flex-1 border-x border-line py-1.5 transition-colors hover:bg-status-error/15 hover:text-status-error"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => moveSaved(index, 1)}
                  disabled={index === saved.length - 1}
                  aria-label="Правее"
                  className="flex-1 py-1.5 transition-colors hover:bg-sand disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}

          {/* Только что выбранные: видно сразу, загрузятся при сохранении */}
          {picked.map((item, index) => (
            <div
              key={item.preview}
              className="relative overflow-hidden rounded-2xl border border-gold bg-cream"
            >
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt="" className="h-full w-full object-cover" />
              </div>

              <span className="absolute left-0 top-0 rounded-br-xl bg-gold px-2 py-0.5 text-xs font-semibold text-white">
                Новое
              </span>

              <button
                type="button"
                onClick={() => removePicked(index)}
                aria-label="Убрать"
                className="block w-full border-t border-line py-1.5 text-xs transition-colors hover:bg-status-error/15 hover:text-status-error"
              >
                ✕ убрать
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Подпись к полю, а не кнопка с искусственным кликом: открывается везде */}
      <label
        className={`press inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-deep ${
          total >= MAX_PHOTOS ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        <IconPhotos className="size-5" />
        Добавить фото
        <input
          ref={inputRef}
          type="file"
          name="photos"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) add(event.target.files)
          }}
        />
      </label>

      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        До {MAX_PHOTOS} фото, каждое до {MAX_MB} МБ. Первое станет обложкой в каталоге.
        {picked.length > 0 && ' Новые загрузятся, когда нажмёте «Сохранить».'}
      </p>

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}
    </div>
  )
}
