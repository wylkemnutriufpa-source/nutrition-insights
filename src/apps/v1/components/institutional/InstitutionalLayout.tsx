import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import InstitutionalFooter from "./InstitutionalFooter";

interface Props {
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
}

export default function InstitutionalLayout({ title, description, lastUpdated, children }: Props) {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>{title} — FitJourney</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-20">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">Última atualização: {lastUpdated}</p>
          <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            {children}
          </article>
        </main>
        <InstitutionalFooter />
      </div>
    </>
  );
}
