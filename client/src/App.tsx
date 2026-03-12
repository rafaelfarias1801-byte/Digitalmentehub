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

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
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