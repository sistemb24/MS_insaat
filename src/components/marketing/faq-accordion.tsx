"use client";

import { useRef, useState, useSyncExternalStore } from "react";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

type FAQAccordionProps = {
  items: FAQItem[];
  allowMultiple?: boolean; // varsayılan false — sadece 1 açık
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

export default function FAQAccordion({
  items,
  allowMultiple = false,
}: FAQAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  const toggleItem = (itemId: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(itemId)) {
        // Açıksa kapat
        newSet.delete(itemId);
      } else {
        // Kapalıysa aç
        if (!allowMultiple) {
          // Tek seferde sadece 1 açık
          newSet.clear();
        }
        newSet.add(itemId);
      }

      return newSet;
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        const triggerId = `faq-trigger-${item.id}`;
        const panelId = `faq-panel-${item.id}`;

        return (
          <FAQAccordionItem
            key={item.id}
            item={item}
            isOpen={isOpen}
            onToggle={() => toggleItem(item.id)}
            triggerId={triggerId}
            panelId={panelId}
            prefersReducedMotion={prefersReducedMotion}
          />
        );
      })}
    </div>
  );
}

type FAQAccordionItemProps = {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  triggerId: string;
  panelId: string;
  prefersReducedMotion: boolean;
};

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
  triggerId,
  panelId,
  prefersReducedMotion,
}: FAQAccordionItemProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        border: "1px solid var(--ds-outline-variant)",
        borderRadius: "var(--ds-radius-panel)",
        overflow: "hidden",
      }}
    >
      {/* Trigger Button */}
      <button
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--ds-on-surface)",
          fontSize: "16px",
          fontWeight: 600,
          transition: prefersReducedMotion
            ? "none"
            : "background 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--ds-surface-low)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span>{item.question}</span>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "24px",
            color: "var(--ds-on-surface-variant)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: prefersReducedMotion
              ? "none"
              : "transform 200ms ease",
            flexShrink: 0,
            marginLeft: "16px",
          }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: prefersReducedMotion
            ? "none"
            : "grid-template-rows 200ms ease",
        }}
      >
        <div
          style={{
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 20px 20px 20px",
              color: "var(--ds-on-surface-variant)",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}
