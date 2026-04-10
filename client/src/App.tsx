import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Produtos from "@/pages/Produtos";
import PacksConteudo from "@/pages/PacksConteudo";
import Consultoria from "@/pages/Consultoria";
import DiagnosticoEstrategico from "@/pages/DiagnosticoEstrategico";
import ObrigadoBriefing from "@/pages/ObrigadoBriefing";
import ObrigadoCompra from "@/pages/ObrigadoCompra";
import ObrigadoCompraDiagnostico from "@/pages/ObrigadoCompraDiagnostico";
import ObrigadoBriefingDiagnostico from "@/pages/ObrigadoBriefingDiagnostico";
import Checkout from "@/pages/Checkout";
import NotFound from "@/pages/not-found";
import CheckoutPack from "@/pages/CheckoutPack";
import WorkspaceApp from "./workspace/WorkspaceApp";
import AnalisePerfilLanding from "@/pages/AnalisePerfilLanding";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dig | Agência de Marketing Digital, Conteúdo e Performance",
  "/produtos": "Produtos | Dig",
  "/produtos/packs": "Packs de Conteúdo | Dig",
  "/produtos/consultoria": "Consultoria | Dig",
  "/produtos/diagnostico-estrategico": "Diagnóstico Estratégico | Dig",
  "/obrigado-briefing": "Obrigado | Dig",
  "/obrigado-compra": "Obrigado pela Compra | Dig",
  "/analise-obrigado-compra": "Obrigado pela Compra | Dig",
  "/analise-obrigado-briefing": "Obrigado | Dig",
  "/checkout-start": "Checkout Start | Dig",
  "/checkout-pro": "Checkout Pro | Dig",
  "/checkout-elite": "Checkout Elite | Dig",
  "/checkout-pack": "Pack | Dig",
  "/workspace": "Workspace Dig",
  "/analise-perfil": "Análise de Perfil | Dig",
};

function getRouteTitle(location: string): string {
  if (location.startsWith("/workspace")) return "Workspace Dig";
  return ROUTE_TITLES[location] ?? "Dig | Agência de Marketing Digital";
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = getRouteTitle(location);
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/produtos" component={Produtos} />
        <Route path="/produtos/packs" component={PacksConteudo} />
        <Route path="/produtos/consultoria" component={Consultoria} />
        <Route path="/produtos/diagnostico-estrategico" component={DiagnosticoEstrategico} />
        <Route path="/obrigado-briefing" component={ObrigadoBriefing} />
        <Route path="/obrigado-compra" component={ObrigadoCompra} />
        <Route path="/analise-obrigado-compra" component={ObrigadoCompraDiagnostico} />
        <Route path="/analise-obrigado-briefing" component={ObrigadoBriefingDiagnostico} />
        <Route path="/checkout-start">{() => <Checkout packId="start" />}</Route>
        <Route path="/checkout-pro">{() => <Checkout packId="pro" />}</Route>
        <Route path="/checkout-elite">{() => <Checkout packId="elite" />}</Route>
        <Route path="/checkout-pack" component={CheckoutPack} />
        <Route path="/workspace" component={WorkspaceApp} />
        <Route path="/workspace/:p1" component={WorkspaceApp} />
        <Route path="/workspace/:p1/:p2" component={WorkspaceApp} />
        <Route path="/workspace/:p1/:p2/:p3" component={WorkspaceApp} />
        <Route path="/workspace/:p1/:p2/:p3/:p4" component={WorkspaceApp} />
        <Route path="/workspace/:p1/:p2/:p3/:p4/:p5" component={WorkspaceApp} />
        <Route path="/analise-perfil" component={AnalisePerfilLanding} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
