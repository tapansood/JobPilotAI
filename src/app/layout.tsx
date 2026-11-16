import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'JobPilotAI — Your next chapter starts here',
  description:
    'A calmer, more focused job search. Your resume, opportunities and network, together.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
