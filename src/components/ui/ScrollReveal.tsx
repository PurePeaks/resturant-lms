"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variant?: "fade-up" | "fade-down" | "fade-in" | "scale-up" | "tilt-3d";
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
  variant = "fade-up",
}: ScrollRevealProps) {
  const getVariants = (): Variants => {
    switch (variant) {
      case "tilt-3d":
        return {
          hidden: { opacity: 0, y: 50, rotateX: 14, scale: 0.96 },
          visible: {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 90,
              damping: 18,
              mass: 0.8,
              delay,
            },
          },
        };
      case "scale-up":
        return {
          hidden: { opacity: 0, scale: 0.92, y: 20 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay,
            },
          },
        };
      case "fade-down":
        return {
          hidden: { opacity: 0, y: -30 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration, ease: [0.16, 1, 0.3, 1], delay },
          },
        };
      case "fade-in":
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration, ease: "easeOut", delay },
          },
        };
      case "fade-up":
      default:
        return {
          hidden: { opacity: 0, y: 36 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration,
              ease: [0.16, 1, 0.3, 1],
              delay,
            },
          },
        };
    }
  };

  return (
    <motion.div
      variants={getVariants()}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      style={{ perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
