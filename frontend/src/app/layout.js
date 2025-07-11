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
  description: "Vote for community wind turbines anywhere in the UK - community wind projects generate cash for communities, reduce the need for grid upgrades and help tackle climate change.",
  manifest: `${assetPrefix}/manifest.json`,
  icons: {
    icon: `${assetPrefix}/favicon.ico`,
    apple: `${assetPrefix}/icons/icon-192.png`,
  },
  openGraph: {
    title: "VoteWind.org",
    description: "Vote for community wind turbines anywhere in the UK - community wind projects generate cash for communities, reduce the need for grid upgrades and help tackle climate change.",
    url: "https://votewind.org",
    siteName: "VoteWind.org",
    images: [
      {
        url: `https://votewind.org/static-frontend/icons/og-image-new.png`,  // Your 1200x630 image
        width: 1200,
        height: 630,
        alt: "VoteWind.org preview image",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoteWind.org",
    description: "Vote for community wind turbines anywhere in the UK - community wind projects generate cash for communities, reduce the need for grid upgrades and help tackle climate change.",
    images: [`https://votewind.org/static-frontend/icons/og-image-new.png`],
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
