import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '../styles/globals.css'; 
import { SessionProvider } from '@/components/session-context';
import WebGLCheck from '@/components/check-webgl';
import Navbar from '@/components/navbar';

import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <WebGLCheck>
        <SessionProvider> 
          <Navbar /> 
          <Component {...pageProps} />
        </SessionProvider>
      </WebGLCheck>
    </>
  );
}

export default MyApp;
