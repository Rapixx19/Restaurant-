import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat Widget | VECTERAI',
  description: 'AI-powered restaurant chat assistant',
};

/**
 * Widget layout that allows iframe embedding.
 * Sets headers to allow cross-origin embedding.
 */
export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-deep-navy">{children}</body>
    </html>
  );
}
