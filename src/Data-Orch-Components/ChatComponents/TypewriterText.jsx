import { useEffect, useRef, useState } from "react";

/**
 * Streams `text` word-by-word at ~30ms/word.
 * Calls onDone() when finished so parent can stop showing the typing indicator.
 */
export function TypewriterText({ text = "", onDone }) {
  const [displayed, setDisplayed] = useState("");
  const idxRef  = useRef(0);
  const prevRef = useRef("");

  useEffect(() => {
    // If text changed (new message), reset
    if (text !== prevRef.current) {
      prevRef.current = text;
      idxRef.current  = 0;
      setDisplayed("");
    }

    const words = text.split(" ");
    if (idxRef.current >= words.length) {
      onDone?.();
      return;
    }

    const timer = setInterval(() => {
      idxRef.current += 1;
      setDisplayed(words.slice(0, idxRef.current).join(" "));
      if (idxRef.current >= words.length) {
        clearInterval(timer);
        onDone?.();
      }
    }, 28);

    return () => clearInterval(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return displayed;
}
