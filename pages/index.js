import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

export default function Home() {
  const [animalInput, setAnimalsInput] = useState("");
  const [result, setResult] = useState();
  const [isLoading, setIsLoading] = useState(false); // neuer State für Ladeanimation
  const [showModal, setShowModal] = useState(false); // neuer State für Modal

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true); // Ladeanimation starten, wenn die Anforderung gestartet wird
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ animal: animalInput }),
      });

      const data = await response.json();
      if (response.status !== 200) {
        throw (
          data.error ||
          new Error(`Request failed with status ${response.status}`)
        );
      }

      setResult(data.result);
      setAnimalsInput("");
    } catch (error) {
      // Consider implementing your own error handling logic here
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false); // Ladeanimation beenden, wenn die Anforderung abgeschlossen ist
    }
  }

  const closeModal = () => {
    setResult(false);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div>
      <Head>
        <title>Emma's Empathie</title>
        <link rel="icon" href="/emma.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1"></meta>
      </Head>
      <main className={styles.main}>
        <div className={styles.logoWrapper}>
        <span className={styles.logo}></span>
        <button onClick={openModal} className={styles.legal}>
        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
        width="24" height="24"
        viewBox="0 0 24 24">
        <path d="M 6 2 C 4.9 2 4 2.9 4 4 L 4 20 C 4 21.1 4.9 22 6 22 L 14 22 C 13.67 21.41 13.410469 20.74 13.230469 20 L 6 20 L 6 4 L 13 4 L 13 9 L 18 9 L 18 11.480469 L 18.689453 11.169922 C 19.109453 10.979922 19.57 10.950312 20 11.070312 L 20 8 L 14 2 L 6 2 z M 8 12 L 8 14 L 13.269531 14 C 13.479531 13.64 13.799453 13.339922 14.189453 13.169922 L 16 12.369141 L 16 12 L 8 12 z M 19.5 13 L 15 15 L 15 18 C 15 21.915 18.22 23.743 19.5 24 C 20.78 23.743 24 21.915 24 18 L 24 15 L 19.5 13 z M 19.5 15.189453 L 22 16.300781 L 22 18 C 22 20.329 20.334 21.504531 19.5 21.894531 C 18.666 21.504531 17 20.329 17 18 L 17 16.300781 L 19.5 15.189453 z M 8 16 L 8 18 L 13 18 L 13 16 L 8 16 z"></path>
        </svg>
        </button>
          {showModal && (
            <div className={styles.resultwrapper}>
              <div className={styles.modalContent}>
                Hier ist der Inhalt des Modals
              </div>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn}>Schließen</button>
            </div>
          )}  
        </div> 
        <div className={styles.mainWrapper}>
          <img
            src="/emma.png"
            className={`${styles.icon} ${isFocused ? styles.hidden : ""}`}
          />
          <h3 className={isFocused ? styles.hidden : ""}>
           Emma's Empathie
          </h3>
          <form
            onSubmit={onSubmit}
            className={isFocused ? styles.scaleTextarea : ""}
          >
            <img
              src="/emma3.png"
              className={`${styles.icon} ${isFocused ? "" : styles.hidden}`}
            ></img>
            <textarea
              style={{ flex: 1 }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              type="text"
              name="animal"
              placeholder="
              Was sind deine Gedanken und Gefühle? Ich helfe dir dich selbst zu
              verstehen. Tippe einfach drauf los..."
              value={animalInput}
              onChange={(e) => setAnimalsInput(e.target.value)}
            />
            <input type="submit" value="Frag' Emma!" />
          </form>
          {isLoading ? (
            <div className={styles.loadingWrapper}>
              <img src="/emma-preloader.gif" />
            </div>
          ) : (
            result && (
              <div className={styles.resultwrapper}>
                <img src="/emma2.png" className={styles.iconResult}></img>
                <div className={styles.result}>
                  <span className={styles.dear}>"Meine Liebe,</span>
                  <br></br>
                  <br></br> {result}"
                </div>
                <button className={styles.closeBtn} onClick={closeModal}>
                  Schließen
                </button>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
