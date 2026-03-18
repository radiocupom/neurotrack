"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  BarChart3, 
  MapPin, 
  MessageCircle, 
  Shield, 
  Zap,
  Users,
  TrendingUp,
  Lock,
  Cpu,
  Activity,
  Globe,
  Fingerprint,
  Eye,
  Target,
  Layers,
  Radio,
  Gauge,
  Share2,
  Bot,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Clock,
  Smartphone,
  Wifi,
  FileText,
  Award,
  Rocket,
  Compass
} from "lucide-react";

export default function Home() {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (scrollTop / docHeight) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 z-50"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Animated Background Grid */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(34,211,238,.05)_25%,rgba(34,211,238,.05)_26%,transparent_27%,transparent_74%,rgba(34,211,238,.05)_75%,rgba(34,211,238,.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(34,211,238,.05)_25%,rgba(34,211,238,.05)_26%,transparent_27%,transparent_74%,rgba(34,211,238,.05)_75%,rgba(34,211,238,.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center px-6 sm:px-12 md:px-24 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(192,132,252,0.3),rgba(34,211,238,0.1))] pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto text-center z-10">
          {/* Glowing Orb */}
          <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
          
          <div className="relative space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 backdrop-blur-sm">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-300">A NOVA FRONTEIRA DA INTELIGÊNCIA POPULACIONAL</span>
            </div>

            {/* Main Title */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                NEURO
              </span>
              <span className="block text-white">TRACK</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Inteligência comportamental em tempo real. Análise psicométrica avançada. 
              <span className="text-cyan-400 font-semibold"> O futuro dos dados populacionais.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <button className="group relative px-8 py-4 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg font-bold text-slate-950 overflow-hidden hover:shadow-2xl hover:shadow-cyan-400/50 transition-all duration-300">
                <span className="relative z-10 flex items-center gap-2">
                  EXPLORAR PLATAFORMA <ChevronRight className="w-4 h-4" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
              <button className="px-8 py-4 border-2 border-cyan-400 rounded-lg font-bold text-cyan-300 hover:bg-cyan-400/10 transition-all duration-300 backdrop-blur-sm">
                DOCUMENTAÇÃO
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-16 max-w-2xl mx-auto">
              {[
                { label: "Entrevistas", value: "1M+" },
                { label: "Precisão", value: "99.8%" },
                { label: "Latência", value: "<100ms" }
              ].map((stat, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-purple-400/30 bg-purple-400/5 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300">
                  <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARDS EM TEMPO REAL */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-purple-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 mb-6">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-300">DASHBOARDS EM TEMPO REAL</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-6">
              <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                Monitoramento Live
              </span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Acompanhe o fluxo das pesquisas conforme acontecem no campo, com latência zero.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Radio,
                title: "Monitoramento Live",
                desc: "Acompanhe o fluxo das pesquisas conforme elas acontecem no campo, com latência zero."
              },
              {
                icon: Eye,
                title: "Visualização Dinâmica",
                desc: "Transformação de dados brutos em inteligência estratégica através de gráficos reativos."
              },
              {
                icon: Zap,
                title: "Decisão Ágil",
                desc: "Respostas imediatas para cenários eleitorais e de opinião em constante mudança."
              }
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-purple-400/30 bg-purple-400/5 backdrop-blur-sm hover:border-cyan-400/50 hover:bg-gradient-to-br hover:from-purple-400/10 hover:to-cyan-400/10 transition-all duration-500 group">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-400 p-0.5 mb-4 group-hover:scale-110 transition-transform">
                  <div className="w-full h-full rounded-lg bg-slate-950 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ÁREA ADMINISTRATIVA */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-cyan-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 w-fit">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">ÁREA ADMINISTRATIVA</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black">
                <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  Controle Total
                </span>
              </h2>

              <p className="text-lg text-slate-300 leading-relaxed">
                Gestão centralizada de todas as pesquisas, usuários e fluxos de trabalho operacionais em uma única interface inteligente.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Layers, text: "Gestão centralizada de todas as pesquisas" },
                  { icon: Lock, text: "Níveis de acesso granulares e protocolos de autenticação" },
                  { icon: Globe, text: "Visão macro de todo o ecossistema Neuro Track" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 hover:border-cyan-400/50 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 flex gap-2">
                <div className="px-3 py-1 rounded-full bg-purple-400/10 border border-purple-400/30 text-xs text-purple-300">
                  PROTOCOLO DE SEGURANÇA ATIVO • 2026
                </div>
              </div>
            </div>

            <div className="relative h-96 rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-purple-400/10 backdrop-blur-xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.2),transparent)]" />
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="w-full space-y-4">
                  {[
                    { label: "SUPERADMIN", value: "Acesso Total", color: "from-red-400" },
                    { label: "ADMIN", value: "Gestão Completa", color: "from-purple-400" },
                    { label: "ENTREVISTADOR", value: "Coleta de Dados", color: "from-cyan-400" }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-slate-600/50 bg-slate-800/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">{item.label}</span>
                        <span className={`text-xs font-bold bg-gradient-to-r ${item.color} to-transparent bg-clip-text text-transparent`}>
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERFACE DO ENTREVISTADOR */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-purple-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative h-96 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 backdrop-blur-xl p-8 overflow-hidden order-2 md:order-1">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(192,132,252,0.2),transparent)]" />
              <div className="relative z-10 h-full flex flex-col items-center justify-center">
                <Smartphone className="w-16 h-16 text-cyan-400 mb-4" />
                <div className="w-full max-w-xs mx-auto bg-slate-900/50 rounded-xl p-4 border border-cyan-400/30">
                  <div className="text-center mb-3">
                    <span className="text-xs text-cyan-400">NEURO TRACK APP</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 bg-cyan-400/20 rounded w-3/4"></div>
                    <div className="h-2 bg-purple-400/20 rounded w-1/2"></div>
                  </div>
                  <div className="w-full py-2 px-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg text-center text-sm font-bold text-slate-950">
                    ENVIAR RESPOSTA
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/10 w-fit">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">INTERFACE DO ENTREVISTADOR</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black">
                <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  Acesso Direto
                </span>
              </h2>

              <p className="text-lg text-slate-300 leading-relaxed">
                Aplicativo intuitivo desenvolvido para que entrevistadores realizem coletas com agilidade e precisão.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Zap, text: "Sincronização Instantânea - envio automático para nuvem" },
                  { icon: Target, text: "Foco na Produtividade - interface otimizada para móveis" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-purple-400/20 bg-purple-400/5 hover:border-purple-400/50 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONECTIVIDADE WHATSAPP */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-cyan-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 w-fit">
                <MessageCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">CONECTIVIDADE WHATSAPP</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black">
                <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  Envio Direto
                </span>
              </h2>

              <p className="text-lg text-slate-300 leading-relaxed">
                As respostas das pesquisas são enviadas automaticamente para o WhatsApp do respondente ou gestor em tempo real.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Share2, text: "Engajamento Imediato - plataforma mais popular" },
                  { icon: CheckCircle2, text: "Transparência e Agilidade - feedback instantâneo" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 hover:border-cyan-400/50 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 space-y-3">
                <div className="p-4 rounded-lg border border-cyan-400/40 bg-cyan-400/5">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-400">NEURO TRACK SYSTEM</span>
                  </div>
                  <p className="text-sm text-slate-300">Olá! Sua pesquisa foi concluída com sucesso. Aqui está o resumo dos seus dados coletados.</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-slate-500">ENTREGUE</span>
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative h-96 rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-purple-400/10 backdrop-blur-xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.2),transparent)]" />
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="w-full space-y-3">
                  {[
                    { msg: "Gestor de Campo: Recebido! Dados integrados ao dashboard.", status: "LIDO" },
                    { msg: "Neuro Track AI: Análise preliminar: +15% região Norte", status: "ENVIANDO..." }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-600/50 bg-slate-800/30">
                      <p className="text-xs text-slate-300 mb-1">{item.msg}</p>
                      <span className="text-[10px] text-slate-500">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MÉTRICAS DE PRODUTIVIDADE */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-purple-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/10 mb-6">
              <Gauge className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">MÉTRICAS DE PRODUTIVIDADE</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-12">
            {[
              { label: "TOTAL DE ENTREVISTAS", value: "2.480" },
              { label: "MÉDIA POR HORA", value: "42.5" },
              { label: "META DO DIA", value: "82%" }
            ].map((metric, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-purple-400/30 bg-purple-400/5 text-center">
                <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {metric.value}
                </div>
                <div className="text-xs text-slate-400 mt-2">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/5 to-purple-400/5 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-cyan-400/20 bg-slate-900/50">
              <div className="text-xs font-bold text-cyan-400">ENTREVISTADOR</div>
              <div className="text-xs font-bold text-cyan-400">PROGRESSO DA META</div>
              <div className="text-xs font-bold text-cyan-400">ENTREVISTAS</div>
              <div className="text-xs font-bold text-cyan-400">STATUS</div>
            </div>
            {[
              { name: "Ana Silva", progress: 85, interviews: 342, status: "ALTA PERFORMANCE", color: "from-cyan-400" },
              { name: "Marcos Oliveira", progress: 78, interviews: 315, status: "ALTA PERFORMANCE", color: "from-cyan-400" },
              { name: "Juliana Costa", progress: 64, interviews: 258, status: "EM PROGRESSO", color: "from-purple-400" },
              { name: "Ricardo Santos", progress: 58, interviews: 234, status: "EM PROGRESSO", color: "from-purple-400" }
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-4 p-4 border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                <div className="text-sm text-slate-200">{row.name}</div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-slate-700">
                    <div className={`h-full rounded-full bg-gradient-to-r ${row.color} to-purple-400`} style={{ width: `${row.progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{row.progress}%</span>
                </div>
                <div className="text-sm text-slate-200">{row.interviews}</div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${row.color === "from-cyan-400" ? "border-cyan-400/30 text-cyan-400" : "border-purple-400/30 text-purple-400"} bg-opacity-10`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANÁLISE POR IA */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-cyan-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 w-fit">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">ANÁLISE POR IA: O MOTOR ESTRATÉGICO</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black">
                <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  Neuro Engine V2.0
                </span>
              </h2>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Eye, text: "Panorama Automático - Interpretação instantânea de dados" },
                  { icon: Sparkles, text: "Insights Estratégicos - Identificação de tendências ocultas" },
                  { icon: Zap, text: "Eficiência Analítica - Redução drástica no tempo de análise" },
                  { icon: TrendingUp, text: "Predição de Cenários - Antecipação de movimentos de opinião" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 hover:border-cyan-400/50 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-96 rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-purple-400/10 backdrop-blur-xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.2),transparent)]" />
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="text-center">
                  <Brain className="w-20 h-20 text-cyan-400 mx-auto mb-4 animate-pulse" />
                  <div className="text-sm text-slate-300">NEURO ENGINE V2.0 • ACTIVE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GEOLOCALIZAÇÃO ESTRATÉGICA */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-purple-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative h-96 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 backdrop-blur-xl p-8 overflow-hidden order-2 md:order-1">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(192,132,252,0.2),transparent)]" />
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="grid grid-cols-3 gap-2 w-full">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx} className="aspect-square rounded-lg bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="text-xs text-cyan-400">RASTREAMENTO GPS ATIVO • AUDITORIA EM TEMPO REAL</span>
              </div>
            </div>

            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/10 w-fit">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">GEOLOCALIZAÇÃO ESTRATÉGICA</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black">
                <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  Mapeamento Preciso
                </span>
              </h2>

              <div className="space-y-4 pt-4">
                {[
                  { icon: MapPin, text: "Mapeamento Preciso - Acompanhamento via GPS" },
                  { icon: Target, text: "Auditoria Geográfica - Garantia dos setores censitários" },
                  { icon: Globe, text: "Análise Espacial - Precisão milimétrica para decisões" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-purple-400/20 bg-purple-400/5 hover:border-purple-400/50 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANÁLISE BIG FIVE */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-cyan-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 w-fit">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">ANÁLISE BIG FIVE: MAPEAMENTO PSICOLÓGICO</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black">
                <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  Perfil Psicológico Médio
                </span>
              </h2>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Brain, text: "Segmentação Profunda - Entendimento do perfil psicológico" },
                  { icon: TrendingUp, text: "Predição de Comportamento - Antecipação de escolhas" },
                  { icon: Award, text: "Metodologia Científica - 5 grandes traços" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 hover:border-cyan-400/50 transition-all duration-300">
                    <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-96 rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-purple-400/10 backdrop-blur-xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.2),transparent)]" />
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="space-y-4 w-full">
                  {[
                    { name: "Abertura", value: 78 },
                    { name: "Consciência", value: 85 },
                    { name: "Extroversão", value: 62 },
                    { name: "Amabilidade", value: 91 },
                    { name: "Neuroticismo", value: 45 }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{item.name}</span>
                        <span className="text-cyan-400 font-semibold">{item.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEGURANÇA E CONFORMIDADE */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-purple-400/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/10 mb-6">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">SEGURANÇA E CONFORMIDADE</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: FileText, title: "LGPD COMPLIANT", desc: "Total conformidade com a Lei Geral de Proteção de Dados" },
              { icon: Lock, title: "CRIPTOGRAFIA", desc: "Proteção absoluta de dados sensíveis end-to-end" },
              { icon: Fingerprint, title: "AUDITABILIDADE", desc: "Logs detalhados e imutáveis para rastreabilidade" }
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-purple-400/30 bg-purple-400/5 text-center hover:border-cyan-400/50 transition-all duration-300">
                <item.icon className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 pt-8">
            {["ISO 27001 READY", "DATA INTEGRITY VERIFIED", "BIOMETRIC AUTH SUPPORT"].map((badge, idx) => (
              <div key={idx} className="px-3 py-1 rounded-full border border-cyan-400/30 text-xs text-cyan-400">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER / FINAL */}
      <section className="relative w-full py-32 px-6 sm:px-12 md:px-24 border-t border-cyan-400/20">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black mb-8">
            <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              MAPEANDO O FUTURO
            </span>
            <span className="block text-white mt-2">DA SOCIEDADE ATRAVÉS DE DADOS</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { icon: Rocket, title: "ESCALABILIDADE", desc: "Preparada para grandes censos nacionais" },
              { icon: Brain, title: "INOVAÇÃO", desc: "Evolução constante com novas tecnologias de IA" },
              { icon: Compass, title: "LIDERANÇA", desc: "A nova fronteira da inteligência populacional" }
            ].map((item, idx) => (
              <div key={idx} className="p-6">
                <item.icon className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-16 border-t border-cyan-400/20">
            <div className="text-sm text-slate-500">
              <span className="text-cyan-400">NEURO TRACK V2.0</span> • 2026 • INTELIGÊNCIA POPULACIONAL
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}