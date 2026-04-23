"use client";

import { useAuthModal } from "@/components/AuthModal";

interface Props {
  className?: string;
  children: React.ReactNode;
}

export function GetStartedButton({ className, children }: Props) {
  const { openModal } = useAuthModal();
  return (
    <button type="button" onClick={() => openModal("register")} className={className}>
      {children}
    </button>
  );
}

export function LogInButton({ className, children }: Props) {
  const { openModal } = useAuthModal();
  return (
    <button type="button" onClick={() => openModal("login")} className={className}>
      {children}
    </button>
  );
}
