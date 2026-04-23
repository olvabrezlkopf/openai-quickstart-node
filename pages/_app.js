import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { DataProvider } from '../context/DataContext';
import Layout from '../components/Layout';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  // Auth pages and legal pages render without the app shell
  const noShell = Component.noShell;

  return (
    <SessionProvider session={session}>
      <DataProvider>
        {noShell ? (
          <Component {...pageProps} />
        ) : (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        )}
      </DataProvider>
    </SessionProvider>
  );
}
