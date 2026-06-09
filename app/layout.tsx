import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Nav } from './nav';

export const metadata: Metadata = {
  title: 'Insurely Day 2026',
  description: 'Mini tournament scoring for the conference',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0e14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bar">
          <img className="logo" src="/insurely-logo.png" alt="Insurely" />
          <div className="sub">Insurely Day 2026</div>
        </header>
        <div className="app">{children}</div>
        <Nav />
      </body>
    </html>
  );
}
