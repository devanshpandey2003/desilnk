"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

export default function AnimatedNumber({ value, format = (n) => n.toLocaleString("en-IN") }) {
  const ref = useRef(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    if (reduce) {
      ref.current.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, format]);

  return <span ref={ref}>{format(value)}</span>;
}
