import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import Navbar from '@/components/navbar'; // adjust path if needed
import { SessionProvider } from '@/components/session-context';
import ClientPolyfills from '../components/polyfills';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const assetPrefix = process.env.ASSET_PREFIX || '';

export const metadata = {
  title: "VoteWind.org",
  description: "Vote for community wind turbines anywhere in the UK",
  manifest: `${assetPrefix}/manifest.json`,
  icons: {
    icon: `${assetPrefix}/favicon.ico`,
    apple: `${assetPrefix}/icons/icon-192.png`,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased m-0 p-0`}>
        {/* <ClientPolyfills/> */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof globalThis === 'undefined') {
                window.globalThis = window;
              }
            `,
          }}
          suppressHydrationWarning
        />        
        {/* reCAPTCHA script globally loaded */}
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="beforeInteractive"
        />
        <Navbar />
        <main>
          <SessionProvider>
            {children}
          </SessionProvider>
        </main>
      </body>
    </html>
  );
}
