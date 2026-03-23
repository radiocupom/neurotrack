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
  return <>{children}</>;
}
