"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface Device3DScrollMockupProps {
  children: React.ReactNode;
  className?: string;
  initialRotateX?: number;
}

export default function Device3DScrollMockup({
  children,
  className = "",
  initialRotateX = 22,
}: Device3DScrollMockupProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });

  // Transform scroll progress into 3D rotational coordinates
  const rotateX = useTransform(smoothProgress, [0, 1], [initialRotateX, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.92, 1]);
  const y = useTransform(smoothProgress, [0, 1], [40, 0]);
  const opacity = useTransform(smoothProgress, [0, 0.4], [0.6, 1]);

  return (
    <div
      ref={containerRef}
      style={{ perspective: 1400 }}
      className={`relative w-full overflow-visible ${className}`}
    >
      <motion.div
        style={{
          rotateX,
          scale,
          y,
          opacity,
          transformStyle: "preserve-3d",
        }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}
