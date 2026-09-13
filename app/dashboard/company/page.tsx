import { redirect } from 'next/navigation'

/** Мастерская переехала в профиль — там она вместе с остальными данными. */
export default function CompanyPage() {
  redirect('/profile/company')
}
