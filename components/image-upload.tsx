'use client'

import { useEffect, useState } from 'react'

const MAX_MB = 5

/**
 * Логотип мастерской. Выбранный файл сразу видно, а загружается он
 * на сервер вместе с формой — как и фото работ.
 */
export function ImageUpload({
  value,
  onChange,
  label,
  name = 'logo_file',
  shape = 'square',
}: {
  value: string | null
  onChange: (url: string | null) => void
  label: string
  name?: string
  shape?: 'square' | 'wide'
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const shown = preview ?? value

  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>

      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 overflow-hidden rounded-2xl border border-line bg-cream ${
            shape === 'wide' ? 'h-24 w-40' : 'size-24'
          }`}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              Пусто
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          <label className="press inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep">
            {shown ? 'Заменить фото' : 'Загрузить фото'}
            <input
              type="file"
              name={name}
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setError(null)
                if (!file) return

                if (file.size > MAX_MB * 1024 * 1024) {
                  setError(`Файл больше ${MAX_MB} МБ`)
                  event.target.value = ''
                  return
                }

                if (preview) URL.revokeObjectURL(preview)
                setPreview(URL.createObjectURL(file))
              }}
            />
          </label>

          {value && !preview && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-sm text-text-muted transition-colors hover:text-status-error"
            >
              Удалить
            </button>
          )}

          <span className="text-xs text-text-muted">
            JPG или PNG, до {MAX_MB} МБ.
            {preview && ' Загрузится при нажатии «Сохранить».'}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}
    </div>
  )
}
