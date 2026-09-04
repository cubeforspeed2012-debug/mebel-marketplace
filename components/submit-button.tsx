'use client'

import { useFormStatus } from 'react-dom'

/**
 * Кнопка отправки, которая сразу показывает, что нажатие принято.
 * Пока форма уходит на сервер, кнопка гаснет и не даёт нажать второй раз —
 * иначе человек жмёт «Одобрить» трижды и не понимает, сработало ли.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = '',
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`press transition-opacity duration-200 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? (pendingLabel ?? '…') : children}
    </button>
  )
}
