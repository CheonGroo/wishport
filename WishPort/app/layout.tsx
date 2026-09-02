import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wish Port · Career Context Workspace',
  description: '흩어진 경험을 한 번 정리하고, 어디서든 다시 꺼내 쓰는 Career Context Workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
