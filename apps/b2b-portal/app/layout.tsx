import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'B2B Reseller Portal',
  description: 'Browse catalog, manage orders, and control your wallet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
