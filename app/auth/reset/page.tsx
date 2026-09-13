import { RequestResetForm } from './reset-forms'

export const metadata = { title: 'Восстановление пароля' }

export default function ResetPage() {
  return (
    <div className="page-glow py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="display text-2xl text-text">Забыли пароль</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Пришлём ссылку на почту — по ней зададите новый пароль.
          </p>
        </div>

        <RequestResetForm />
      </div>
    </div>
  )
}
