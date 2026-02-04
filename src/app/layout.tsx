import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { appConfig } from "@/lib/config/theme";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${appConfig.name} | Project Management`,
  description: appConfig.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent FOUC — reads localStorage before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('taskflow-theme-mode') || 'dark';
                  var resolved = mode;
                  if (mode === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (resolved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
