'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_MB = 5

/**
 * Загрузка фото в хранилище Supabase прямо из браузера.
 * Возвращает ссылку на файл — её и сохраняем в базу.
 */
export function ImageUpload({
  value,
  onChange,
  label = 'Фото',
  shape = 'square',
}: {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  shape?: 'square' | 'wide'
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('Это не картинка — нужен файл JPG или PNG')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Файл больше ${MAX_MB} МБ — сожмите фото и попробуйте снова`)
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Сессия истекла — войдите заново')

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('company-media')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('company-media').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>

      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 overflow-hidden border border-line bg-cream ${
            shape === 'wide' ? 'h-24 w-40' : 'size-24'
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              Пусто
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="border border-line bg-paper px-4 py-2 text-sm font-semibold transition-colors hover:border-gold disabled:opacity-60"
          >
            {uploading ? 'Загружаем…' : value ? 'Заменить фото' : 'Загрузить фото'}
          </button>

          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-left text-sm text-text-muted transition-colors hover:text-red-700"
            >
              Удалить
            </button>
          )}

          <span className="text-xs text-text-muted">JPG или PNG, до {MAX_MB} МБ</span>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
