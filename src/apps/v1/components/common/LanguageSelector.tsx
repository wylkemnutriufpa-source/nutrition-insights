import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { languages } from "@v1/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@v1/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  collapsed?: boolean;
}

const LanguageSelector = forwardRef<HTMLDivElement, LanguageSelectorProps>(function LanguageSelector({ collapsed }, ref) {
  const { i18n } = useTranslation();

  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div ref={ref}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-all">
            <Globe className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm flex items-center gap-2">
                <span>{current.flag}</span>
                <span>{current.label}</span>
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex items-center gap-2 cursor-pointer ${
                i18n.language === lang.code ? "bg-primary/10 text-primary font-medium" : ""
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export default LanguageSelector;
