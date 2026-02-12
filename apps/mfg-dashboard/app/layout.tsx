import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Manufacturing Dashboard',
  description: 'Factory management — production pipeline, QC, and shipping',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100">{children}</body>
    </html>
  );
}
