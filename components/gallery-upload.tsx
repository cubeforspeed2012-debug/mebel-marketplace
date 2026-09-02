'use client'

import { useRef, useState } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)

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

      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`«${file.name}» больше ${MAX_MB} МБ — пропущен`)
          continue
        }

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('company-media')
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        uploaded.push(supabase.storage.from('company-media').getPublicUrl(path).data.publicUrl)
      }

      if (uploaded.length) onChange([...value, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
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
            <div key={url} className="relative border border-line bg-cream">
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>

              {index === 0 && (
                <span className="absolute left-0 top-0 bg-gold px-2 py-0.5 text-xs font-semibold text-ink">
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
                  className="flex-1 border-x border-line py-1.5 transition-colors hover:bg-red-50 hover:text-red-700"
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <button
        type="button"
        disabled={uploading || value.length >= MAX_PHOTOS}
        onClick={() => inputRef.current?.click()}
        className="border border-line bg-paper px-5 py-2.5 text-sm font-semibold transition-colors hover:border-gold disabled:opacity-60"
      >
        {uploading ? 'Загружаем…' : 'Добавить фото'}
      </button>

      <span className="ml-3 text-xs text-text-muted">
        До {MAX_PHOTOS} фото, каждое до {MAX_MB} МБ. Первое станет обложкой.
      </span>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
