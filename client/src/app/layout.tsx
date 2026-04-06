import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/ui/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title:       'Smart Task Manager',
  description: 'Manage your tasks smartly',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}