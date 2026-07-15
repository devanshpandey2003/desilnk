"use client";

import { LazyMotion } from "framer-motion";

// Lazy-load animation features so framer-motion adds ~5kb to the initial bundle
const loadFeatures = () =>
  import("framer-motion").then((mod) => mod.domAnimation);

export default function MotionProvider({ children }) {
  return <LazyMotion features={loadFeatures} strict>{children}</LazyMotion>;
}
