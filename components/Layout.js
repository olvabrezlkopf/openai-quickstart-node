import Nav from './Nav';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  return (
    <>
      <Nav />
      <main className={styles.main}>
        {children}
      </main>
      <Sidebar />
    </>
  );
}
