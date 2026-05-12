import { Link } from "react-router-dom";

const links = [
  { to: "/privacy", label: "Política de Privacidade" },
  { to: "/terms", label: "Termos de Uso" },
  { to: "/settings/account-deletion", label: "Exclusão de Conta" },
];

export default function InstitutionalFooter() {
  return (
    <footer className="border-t border-border bg-muted/40 py-8 mt-16">
      <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-4">
        <p className="text-sm font-semibold text-foreground tracking-wide">FitJourney</p>
        <nav className="flex flex-wrap justify-center gap-4">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FitJourney — Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
