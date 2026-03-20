"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffectEvent } from "react";
import { Brain, CircleUser, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/auth/constants";

import { useAuth } from "./auth-provider";
import { LoginModal } from "./login-modal";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isAuthenticated,
    isBusy,
    modalOpen,
    openLoginModal,
    closeLoginModal,
    login,
    logout,
  } = useAuth();

  const syncLoginFromQuery = useEffectEvent((redirectTo: string) => {
    openLoginModal(redirectTo);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("login");
    nextParams.delete("redirect");

    const nextUrl = nextParams.size ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl);
  });

  useEffect(() => {
    if (isAuthenticated || searchParams.get("login") !== "1") {
      return;
    }

    syncLoginFromQuery(searchParams.get("redirect") ?? DEFAULT_LOGIN_REDIRECT);
  }, [isAuthenticated, searchParams]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-lg shadow-cyan-950/30 transition group-hover:scale-105 group-hover:border-cyan-300/60">
              <Brain className="size-5" />
            </span>

            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
                Neuro Track
              </span>
              <span className="block text-sm text-slate-300">
                Inteligencia populacional protegida
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => router.push("/areashow")}
                className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 sm:flex"
              >
                <CircleUser className="size-4 shrink-0 text-cyan-300" />
                <span className="max-w-[120px] truncate text-xs font-medium text-slate-200">
                  {user.nome}
                </span>
                <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  {user.papel}
                </span>
              </button>
            ) : null}

            {isAuthenticated ? (
              <Button
                type="button"
                onClick={() => void logout()}
                disabled={isBusy}
                className="h-11 rounded-2xl bg-linear-to-r from-rose-400 to-orange-400 px-5 font-semibold text-slate-950 hover:opacity-95"
              >
                <LogOut className="size-4" />
                Logout
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => openLoginModal(DEFAULT_LOGIN_REDIRECT)}
                className="h-11 rounded-2xl bg-linear-to-r from-cyan-400 to-violet-500 px-5 font-semibold text-slate-950 hover:opacity-95"
              >
                <LogIn className="size-4" />
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={modalOpen} pending={isBusy} onClose={closeLoginModal} onSubmit={login} />
    </>
  );
}
