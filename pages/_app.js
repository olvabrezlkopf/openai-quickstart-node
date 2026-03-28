import '../styles/globals.css';
import { DataProvider } from '../context/DataContext';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  return (
    <DataProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </DataProvider>
  );
}
