"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type FeatureCardProps = {
  description: string; // 2 cümle max
  icon: React.ReactNode; // SVG veya string emoji
  title: string;
  delay?: number; // stagger delay ms (0, 80, 160, 240...)
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

export default function FeatureCard({
  description,
  icon,
  title,
  delay = 0,
}: FeatureCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const card = cardRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    if (card) {
      observer.observe(card);
    }

    return () => {
      if (card) {
        observer.unobserve(card);
      }
    };
  }, [prefersReducedMotion]);

  const shouldShow = prefersReducedMotion || isVisible;

  return (
    <div
      ref={cardRef}
      style={{
        background: "var(--ds-surface-raised)",
        border: "1px solid var(--ds-outline-variant)",
        borderRadius: "var(--ds-radius-panel)",
        padding: "24px",
        opacity: shouldShow ? 1 : 0,
        transform: shouldShow ? "translateY(0)" : "translateY(20px)",
        transition: prefersReducedMotion
          ? "none"
          : "opacity 400ms ease, transform 400ms ease",
        transitionDelay: prefersReducedMotion ? "0ms" : `${delay}ms`,
      }}
    >
      {/* Icon */}
      <div
        className="mb-4"
        style={{
          color: "var(--ds-primary)",
          fontSize: "32px",
          lineHeight: "1",
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        className="mb-2 text-lg font-semibold"
        style={{
          color: "var(--ds-on-surface)",
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-sm leading-relaxed"
        style={{
          color: "var(--ds-on-surface-variant)",
        }}
      >
        {description}
      </p>
    </div>
  );
}
