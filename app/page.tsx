import { redirect } from 'next/navigation';

// Public board lives under /public (deny-by-default Cloudflare Access:
// /public/* + assets are bypassed, everything else is protected).
export default function Root() {
  redirect('/public');
}
