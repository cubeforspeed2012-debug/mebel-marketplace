'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_MB = 5
const MAX_PHOTOS = 12

/**
 * Галерея фото товара: несколько снимков, порядок задаётся перетаскиванием
 * кнопками «влево/вправо». Первое фото — обложка в каталоге.
 */
export function GalleryUpload({
  value,
  onChange,
}: {
  value: string[]
  onChange: (urls: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  async function handleFiles(files: FileList) {
    setError(null)

    const room = MAX_PHOTOS - value.length
    if (room <= 0) {
      setError(`Больше ${MAX_PHOTOS} фото не нужно`)
      return
    }

    setUploading(true)
    const uploaded: string[] = []

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Сессия истекла — войдите заново')

      const list = Array.from(files).slice(0, room)

      for (const [index, file] of list.entries()) {
        setProgress(`Загружаем ${index + 1} из ${list.length}…`)

        // Телефоны иногда не ставят тип файла — судим и по расширению
        const looksLikeImage =
          file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
        if (!looksLikeImage) continue
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`«${file.name}» больше ${MAX_MB} МБ — пропущен`)
          continue
        }

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('company-media')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/jpeg',
          })

        if (uploadError) throw new Error(`Не удалось загрузить «${file.name}»: ${uploadError.message}`)

        uploaded.push(supabase.storage.from('company-media').getPublicUrl(path).data.publicUrl)
      }

      if (uploaded.length) onChange([...value, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...value]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        Фото работы
      </span>

      {value.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, index) => (
            <div key={url} className="relative overflow-hidden rounded-2xl border border-line bg-cream">
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>

              {index === 0 && (
                <span className="absolute left-0 top-0 bg-gold px-2 py-0.5 text-xs font-semibold text-text">
                  Обложка
                </span>
              )}

              <div className="flex border-t border-line text-xs">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Сдвинуть влево"
                  className="flex-1 py-1.5 transition-colors hover:bg-cream disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((u) => u !== url))}
                  aria-label="Удалить фото"
                  className="flex-1 border-x border-line py-1.5 transition-colors hover:bg-[#b91c1c]/15 hover:text-status-error"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label="Сдвинуть вправо"
                  className="flex-1 py-1.5 transition-colors hover:bg-cream disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/*
        Настоящая подпись к полю, а не кнопка с искусственным кликом:
        на телефонах скрытое поле файла через .click() открывается не везде,
        а label открывает выбор файла в любом браузере.
      */}
      <label
        className={`press inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep ${
          uploading || value.length >= MAX_PHOTOS ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        {uploading ? (progress ?? 'Загружаем…') : 'Добавить фото'}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading || value.length >= MAX_PHOTOS}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </label>

      <span className="ml-3 text-xs text-text-muted">
        До {MAX_PHOTOS} фото, каждое до {MAX_MB} МБ. Первое станет обложкой.
      </span>

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}
    </div>
  )
}
