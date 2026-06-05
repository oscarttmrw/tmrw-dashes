import { redirect } from 'next/navigation'

// Retention has been folded into the Members page. Keep the route working by
// redirecting any old links / bookmarks there.
export default function RetentionPage() {
  redirect('/members')
}
