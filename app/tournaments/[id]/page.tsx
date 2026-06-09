import { redirect } from 'next/navigation';

// Score entry moved to /score/[id]. Keep this path working for old links.
export default async function TournamentRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/score/${id}`);
}
