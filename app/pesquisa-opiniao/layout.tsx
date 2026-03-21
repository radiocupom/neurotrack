/**
 * Layout para Pesquisa de Opinião
 * Wrapper comum para todas as páginas de pesquisa
 */

import React from "react";

export const metadata = {
  title: "Pesquisa de Opinião",
  description: "Sistema de pesquisa de opinião - responda pesquisas e participe",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function PesquisaOpiniaoLayout({ children }: LayoutProps) {
  return (
    <div className="relative">
      {/* Header opcional */}
      <header className="bg-white border-b border-gray-200 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Sistema de Pesquisa de Opinião
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Sua opinião é importante para nós
          </p>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer opcional */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-sm text-gray-600">
            © 2026 Plataforma Neuro Track. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
