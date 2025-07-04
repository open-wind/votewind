import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
        <script src="https://cdn.jsdelivr.net/npm/core-js-bundle@3/minified.js"></script>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof MutationObserver === 'undefined') {
                // Minimal no-op polyfill (won't actually observe mutations, but prevents errors)
                window.MutationObserver = function() {
                  this.observe = function() {};
                  this.disconnect = function() {};
                  this.takeRecords = function() { return []; };
                };
              }
            `
          }}
        />     
        <script
            dangerouslySetInnerHTML={{
              __html: `
                if (!window.performance) {
                  window.performance = {};
                }
                if (!window.performance.now) {
                  window.performance.now = function() {
                    return Date.now();
                  };
                }
              `
            }}
          />

        {/* reCAPTCHA script globally loaded */}
        <script
          src="https://www.google.com/recaptcha/api.js"
          strategy="beforeInteractive"
        />
        
        </Head>
        <body className="antialiased m-0 p-0">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
