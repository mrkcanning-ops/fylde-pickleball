import { redirect } from 'next/navigation';

export default function PreviousSeasonPage() {
  // Redirect to the main app and activate the Previous Seasons tab there.
  redirect('/?tab=Previous%20Seasons');
}

