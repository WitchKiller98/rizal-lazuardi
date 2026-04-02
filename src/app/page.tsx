import { redirect } from 'next/navigation'

// Redirect dari root ke dashboard atau login
export default function HomePage() {
  redirect('/dashboard')
}
