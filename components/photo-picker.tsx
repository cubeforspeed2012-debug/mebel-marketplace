'use client'

import { useEffect, useState } from 'react'
import { IconPhotos } from '@/components/ui-icons'

const MAX_MB = 5

type Batch = { id: number; previews: string[]; names: string[] }

/**
 * Выбор фотографий работы.
 *
 * Важно: файлы никуда не перекладываются программно — каждая партия живёт
 * в своём поле формы и уходит на сервер как есть. Раньше выбор собирался
 * в один список через DataTransfer, а его не умеет Safari на айфоне:
 * выбор ломался молча, и фото не доходили.
 */
export function PhotoPicker({
  saved,
  onChangeSaved,
}: {
  saved: string[]
  onChangeSaved: (urls: string[]) => void
}) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [slots, setSlots] = useState<number[]>([0])
  const [error, setError] = useState<string | null>(null)

  // Ссылки на предпросмотр держат файлы в памяти — отпускаем их за собой
  useEffect(() => {
    return () => batches.forEach((b) => b.previews.forEach(URL.revokeObjectURL))
  }, [batches])

  function pick(slotId: number, files: FileList) {
    setError(null)

    const accepted: File[] = []

    for (const file of Array.from(files)) {
      const looksLikeImage =
        file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)

      if (!looksLikeImage) {
        setError(`«${file.name}» — не фотография`)
        continue
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`«${file.name}» больше ${MAX_MB} МБ — выберите фото полегче`)
        continue
      }

      accepted.push(file)
    }

    if (accepted.length === 0) return

    setBatches((current) => [
      ...current.filter((b) => b.id !== slotId),
      {
        id: slotId,
        previews: accepted.map((file) => URL.createObjectURL(file)),
        names: accepted.map((file) => file.name),
      },
    ])

    // Даём следующее пустое поле — чтобы можно было добавить ещё
    setSlots((current) => (current.includes(slotId + 1) ? current : [...current, slotId + 1]))
  }

  function dropBatch(slotId: number) {
    setBatches((current) => {
      current.find((b) => b.id === slotId)?.previews.forEach(URL.revokeObjectURL)
      return current.filter((b) => b.id !== slotId)
    })
    // Убираем и само поле: вместе с ним из формы уйдут выбранные в нём файлы
    setSlots((current) => current.filter((id) => id !== slotId))
  }

  function moveSaved(index: number, direction: -1 | 1) {
    const next = [...saved]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChangeSaved(next)
  }

  const pickedCount = batches.reduce((sum, b) => sum + b.previews.length, 0)

  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        Фото работы
      </span>

      {(saved.length > 0 || pickedCount > 0) && (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
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

          {batches.map((batch) =>
            batch.previews.map((preview, index) => (
              <div
                key={preview}
                className="relative overflow-hidden rounded-2xl border border-gold bg-cream"
              >
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                </div>

                <span className="absolute left-0 top-0 rounded-br-xl bg-gold px-2 py-0.5 text-xs font-semibold text-white">
                  Новое
                </span>

                {index === 0 && (
                  <button
                    type="button"
                    onClick={() => dropBatch(batch.id)}
                    className="block w-full border-t border-line py-1.5 text-xs transition-colors hover:bg-status-error/15 hover:text-status-error"
                  >
                    ✕ убрать
                  </button>
                )}
              </div>
            )),
          )}
        </div>
      )}

      {/*
        Каждое поле — своя партия фото. Подпись к полю открывает выбор
        в любом браузере, в отличие от кнопки с искусственным нажатием.
      */}
      {slots.map((slotId) => {
        const filled = batches.some((b) => b.id === slotId)

        return (
          <label
            key={slotId}
            className={`press mr-2 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
              filled
                ? 'hidden'
                : 'bg-gold text-white hover:bg-gold-deep'
            }`}
          >
            <IconPhotos className="size-5" />
            {saved.length > 0 || pickedCount > 0 ? 'Добавить ещё' : 'Добавить фото'}
            <input
              type="file"
              name="photos"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files?.length) pick(slotId, event.target.files)
              }}
            />
          </label>
        )
      })}

      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Каждое фото до {MAX_MB} МБ. Первое станет обложкой в каталоге.
        {pickedCount > 0 && ' Новые загрузятся, когда нажмёте «Сохранить».'}
      </p>

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}
    </div>
  )
}
