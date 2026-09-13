import { redirect } from 'next/navigation'

/** Мастерская теперь редактируется на одном экране с профилем — там всё вместе. */
export default function CompanyPage() {
  redirect('/profile')
}
