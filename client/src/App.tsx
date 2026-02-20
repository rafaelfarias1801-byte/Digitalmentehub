import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Produtos from "@/pages/Produtos";
import PacksConteudo from "@/pages/PacksConteudo";
import Consultoria from "@/pages/Consultoria";
import AnaliseInstagram from "@/pages/AnaliseInstagram";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/produtos" component={Produtos} />
      <Route path="/produtos/packs" component={PacksConteudo} />
      <Route path="/produtos/consultoria" component={Consultoria} />
      <Route path="/produtos/analise-instagram" component={AnaliseInstagram} />
      <Route component={NotFound} />
    </Switch>
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
