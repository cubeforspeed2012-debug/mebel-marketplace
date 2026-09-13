'use client'

import { useActionState } from 'react'
import { PhotoPicker } from '@/components/photo-picker'
import { SubmitButton } from '@/components/submit-button'
import { addPortfolioPhotos, removePortfolioPhoto, type PortfolioState } from './portfolio-actions'

const EMPTY: PortfolioState = {}

export type PortfolioPhoto = { id: number; url: string }

/**
 * Портфолио на странице работ: витрина того, что мастер уже сделал.
 * Не товары — просто фотографии, чтобы человек увидел уровень работы.
 */
export function Portfolio({ photos }: { photos: PortfolioPhoto[] }) {
  const [state, action] = useActionState(addPortfolioPhotos, EMPTY)

  return (
    <section className="rounded-3xl bg-paper p-5 sm:p-6">
      <h2 className="display text-lg text-text">Моё портфолио</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
        До 12 фотографий сделанных работ. Их видят первыми на вашей странице — даже те,
        кого пока нет в каталоге. Снимайте готовую мебель у клиента дома: такие фото
        работают лучше, чем снятые в цеху.
      </p>

      {photos.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative overflow-hidden rounded-2xl border border-line bg-cream"
            >
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>

              <form action={removePortfolioPhoto}>
                <input type="hidden" name="id" value={photo.id} />
                <SubmitButton
                  pendingLabel="…"
                  className="block w-full border-t border-line py-1.5 text-xs hover:bg-status-error/15 hover:text-status-error"
                >
                  ✕ убрать
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}

      {photos.length < 12 ? (
        <form action={action} className="mt-5">
          <PhotoPicker saved={[]} onChangeSaved={() => {}} />

          {state.error && (
            <p className="mt-3 rounded-2xl bg-status-error/15 px-4 py-3 text-sm text-status-error">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="mt-3 rounded-2xl bg-status-done/15 px-4 py-3 text-sm text-status-done">
              {state.message}
            </p>
          )}

          <SubmitButton
            pendingLabel="Загружаем…"
            className="mt-4 rounded-full bg-gold px-7 py-3 font-semibold text-white hover:bg-gold-deep"
          >
            Загрузить в портфолио
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-5 text-sm text-text-muted">
          Портфолио заполнено: 12 из 12. Уберите лишнее, чтобы добавить новое.
        </p>
      )}
    </section>
  )
}
