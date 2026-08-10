import { motion, type Variants } from "framer-motion";
import * as React from "react";

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Stagger index — multiplies the entrance delay. */
  index?: number;
  as?: "div" | "section" | "li" | "article";
}

/**
 * Scroll-triggered micro-animation wrapper. Fades + lifts its children into
 * view once, respecting the viewport margin so it fires slightly early.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
  ...props
}: RevealProps) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={variants}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
