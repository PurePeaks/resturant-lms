"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glareEffect?: boolean;
}

export default function TiltCard3D({
  children,
  className = "",
  maxTilt = 12,
  glareEffect = true,
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse coordinates relative to center of card (-0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for fluid, physics-based return
  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  // Map to 3D rotation angles
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-maxTilt, maxTilt]);

  // Specular reflection coordinates
  const glareX = useTransform(smoothX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(smoothY, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const normX = mouseX / rect.width - 0.5;
      const normY = mouseY / rect.height - 0.5;

      x.set(normX);
      y.set(normY);
    },
    [x, y]
  );

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: 1200 }} className="relative">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale: 1.015 }}
        transition={{ duration: 0.2 }}
        className={`relative transition-shadow duration-300 ${className}`}
      >
        {children}

        {/* Dynamic Specular Glass Reflection Hotspot */}
        {glareEffect && (
          <motion.div
            style={{
              background: `radial-gradient(circle 350px at ${glareX} ${glareY}, rgba(255, 255, 255, 0.12), transparent 70%)`,
              opacity: isHovered ? 1 : 0,
            }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-30"
          />
        )}
      </motion.div>
    </div>
  );
}
