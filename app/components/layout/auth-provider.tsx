"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import { DEFAULT_LOGIN_REDIRECT } from "@/lib/auth/constants";
import type { AuthUser } from "@/lib/auth/types";
import { loginAction, logoutAction } from "@/app/components/layout/auth-actions";

type LoginCredentials = {
  email: string;
  senha: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBusy: boolean;
  modalOpen: boolean;
  openLoginModal: (redirectTo?: string) => void;
  closeLoginModal: () => void;
  login: (credentials: LoginCredentials, redirectTo?: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isBusy, setIsBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState(DEFAULT_LOGIN_REDIRECT);

  async function login(credentials: LoginCredentials, nextRedirect?: string) {
    setIsBusy(true);

    try {
      const payload = await loginAction(credentials);

      if (!payload.ok || !payload.user) {
        return {
          ok: false,
          message: payload?.message ?? "Nao foi possivel concluir o login.",
        };
      }

      setUser(payload.user);
      setModalOpen(false);
      router.push(nextRedirect ?? redirectTo);
      router.refresh();

      return {
        ok: true,
        message: payload.message,
      };
    } finally {
      setIsBusy(false);
    }
  }

  async function logout() {
    setIsBusy(true);

    try {
      await logoutAction();

      setUser(null);
      setModalOpen(false);
      setRedirectTo(DEFAULT_LOGIN_REDIRECT);
      router.push("/");
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  function openLoginModal(nextRedirect = DEFAULT_LOGIN_REDIRECT) {
    setRedirectTo(nextRedirect);
    setModalOpen(true);
  }

  function closeLoginModal() {
    setModalOpen(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isBusy,
        modalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}
