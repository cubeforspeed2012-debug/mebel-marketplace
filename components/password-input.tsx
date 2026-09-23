'use client'

import { useState } from 'react'

function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" strokeWidth={1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" strokeWidth={1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5c1.5 0 2.9.4 4.1 1M21.5 12S18 18.5 12 18.5c-1.6 0-3-.4-4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M4 4l16 16" />
    </svg>
  )
}

/**
 * Поле пароля с кнопкой «показать».
 *
 * На телефоне пароль набирают вслепую, и промахнуться легко — особенно
 * когда раскладка переключилась или сработал автозамен. Человек видит
 * «неверный пароль», хотя пароль помнит, и решает, что потерял доступ.
 * Кнопка-глаз стоит меньше минуты работы и снимает этот класс обращений
 * целиком.
 *
 * Видимость никуда не сохраняется: открыл, проверил, поле закрылось
 * вместе со страницей.
 */
export function PasswordInput({
  name = 'password',
  autoComplete = 'current-password',
  className = '',
  required = true,
}: {
  name?: string
  autoComplete?: string
  className?: string
  required?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative block">
      <input
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        autoComplete={autoComplete}
        // Место справа под кнопку — иначе точки уезжают под неё
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        // tabIndex -1: с клавиатуры человек идёт из пароля сразу на кнопку входа
        tabIndex={-1}
        className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text"
      >
        {visible ? <EyeClosed /> : <EyeOpen />}
      </button>
    </span>
  )
}
