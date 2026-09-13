import { NewPasswordForm } from '../reset/reset-forms'

export const metadata = { title: 'Новый пароль' }

export default function NewPasswordPage() {
  return (
    <div className="page-glow py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="display text-2xl text-text">Новый пароль</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Придумайте пароль, которым будете входить в кабинет.
          </p>
        </div>

        <NewPasswordForm />
      </div>
    </div>
  )
}
