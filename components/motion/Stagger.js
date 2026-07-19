"use client";

import { m, useReducedMotion } from "framer-motion";

const parent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export function Stagger({ children, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      variants={parent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, className, ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <m.div className={className} variants={child} {...rest}>
      {children}
    </m.div>
  );
}
