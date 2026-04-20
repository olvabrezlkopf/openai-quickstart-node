import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { DataProvider } from '../context/DataContext';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Wrap client-side navigation in document.startViewTransition where supported
  useEffect(() => {
    if (typeof document === 'undefined' || !document.startViewTransition) return;

    let pendingResolve = null;
    let currentTransition = null;

    const beforeChange = () => {
      if (currentTransition) return;
      currentTransition = document.startViewTransition(() => {
        return new Promise((resolve) => { pendingResolve = resolve; });
      });
      currentTransition.finished.finally(() => {
        currentTransition = null;
        pendingResolve = null;
      });
    };

    const afterChange = () => {
      if (pendingResolve) {
        // Defer one frame so React has committed the new page
        requestAnimationFrame(() => pendingResolve && pendingResolve());
      }
    };

    router.events.on('routeChangeStart', beforeChange);
    router.events.on('routeChangeComplete', afterChange);
    router.events.on('routeChangeError', afterChange);

    return () => {
      router.events.off('routeChangeStart', beforeChange);
      router.events.off('routeChangeComplete', afterChange);
      router.events.off('routeChangeError', afterChange);
    };
  }, [router]);

  return (
    <DataProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </DataProvider>
  );
}
