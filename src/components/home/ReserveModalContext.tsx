"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import ReserveKitModal from "./ReserveKitModal";

interface ReserveModalContextType {
  openReserveModal: (defaultKit?: string) => void;
  closeReserveModal: () => void;
  isOpen: boolean;
}

const ReserveModalContext = createContext<ReserveModalContextType | undefined>(undefined);

export function ReserveModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultKit, setDefaultKit] = useState<string | undefined>(undefined);

  const openReserveModal = useCallback((kit?: string) => {
    setDefaultKit(kit);
    setIsOpen(true);
  }, []);

  const closeReserveModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Listen for #reserve in hash or global events
  useEffect(() => {
    const checkHash = () => {
      if (typeof window !== "undefined" && window.location.hash === "#reserve") {
        setIsOpen(true);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ defaultKit?: string }>;
      openReserveModal(customEvent.detail?.defaultKit);
    };

    window.addEventListener("hashchange", checkHash);
    window.addEventListener("open-reserve-modal", handleCustomEvent);

    checkHash();

    return () => {
      window.removeEventListener("hashchange", checkHash);
      window.removeEventListener("open-reserve-modal", handleCustomEvent);
    };
  }, [openReserveModal]);

  return (
    <ReserveModalContext.Provider value={{ openReserveModal, closeReserveModal, isOpen }}>
      {children}
      <ReserveKitModal isOpen={isOpen} onClose={closeReserveModal} defaultKit={defaultKit} />
    </ReserveModalContext.Provider>
  );
}

export function useReserveModal() {
  const context = useContext(ReserveModalContext);
  if (!context) {
    return {
      openReserveModal: (defaultKit?: string) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-reserve-modal", { detail: { defaultKit } }));
        }
      },
      closeReserveModal: () => {},
      isOpen: false,
    };
  }
  return context;
}
