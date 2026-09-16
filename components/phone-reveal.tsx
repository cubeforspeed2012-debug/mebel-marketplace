'use client'

import { useState, useTransition } from 'react'
import { revealPhone } from '@/app/contact-actions'
import { formatPhone, telHref } from '@/lib/constants'

/**
 * «Показать номер» — номер не лежит на странице, а приезжает по нажатию.
 * Так его не выкачать роботом, а мастер видит, сколько людей захотели
 * позвонить. Первое нажатие показывает номер, второе — звонит.
 */
export function PhoneReveal({
  companyId,
  productId,
  labelShow,
  labelMissing,
  className,
  icon,
}: {
  companyId: number
  productId?: number | null
  labelShow: string
  labelMissing: string
  className: string
  icon: React.ReactNode
}) {
  const [phone, setPhone] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [pending, startTransition] = useTransition()

  // Номер уже на экране — дальше это обычная ссылка «позвонить»
  if (phone) {
    return (
      <a href={telHref(phone)} className={className}>
        {icon}
        {formatPhone(phone)}
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled={pending || missing}
      onClick={() =>
        startTransition(async () => {
          const result = await revealPhone(companyId, productId)
          if (result.phone) setPhone(result.phone)
          else setMissing(true)
        })
      }
      className={`${className} ${pending ? 'opacity-70' : ''} ${missing ? 'cursor-default' : ''}`}
    >
      {icon}
      {missing ? labelMissing : labelShow}
    </button>
  )
}
