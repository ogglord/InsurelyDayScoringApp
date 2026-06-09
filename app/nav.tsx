'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'BOARD', ico: '▦' },
  { href: '/score', label: 'SCORE', ico: '✎' },
  { href: '/tournaments', label: 'EVENTS', ico: '◎' },
  { href: '/teams', label: 'TEAMS', ico: '⦿' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {items.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={active ? 'active' : ''}>
            <span className="ico">{it.ico}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
