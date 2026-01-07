import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import './globals.css';
import '@mantine/core/styles.css';

export const metadata = {
  title: 'ROK-FIT AI Monitor',
  description: 'Premium AI Workout Analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark" theme={{
          primaryColor: 'teal',
          defaultRadius: 'lg',
          fontFamily: 'Inter, sans-serif',
        }}>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
