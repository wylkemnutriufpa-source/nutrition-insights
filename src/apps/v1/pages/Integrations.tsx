import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send, Bot, Search, Globe, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { telegramApi } from "@/lib/api/telegram";
import { firecrawlApi } from "@/lib/api/firecrawl";

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground">Gerencie suas integrações com serviços externos</p>
      </div>

      <Tabs defaultValue="telegram" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Telegram Bot
          </TabsTrigger>
          <TabsTrigger value="firecrawl" className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Firecrawl
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telegram">
          <TelegramSection />
        </TabsContent>

        <TabsContent value="firecrawl">
          <FirecrawlSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TelegramSection() {
  const [botInfo, setBotInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await telegramApi.getMe();
      if (result.success) {
        setBotInfo(result.data);
        toast.success(`Bot conectado: @${result.data.username}`);
      } else {
        toast.error(result.error || "Falha ao conectar");
      }
    } catch (e) {
      toast.error("Erro ao testar conexão");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!chatId || !message) {
      toast.error("Preencha o Chat ID e a mensagem");
      return;
    }
    setSending(true);
    try {
      const result = await telegramApi.sendMessage(chatId, message);
      if (result.success) {
        toast.success("Mensagem enviada!");
        setMessage("");
      } else {
        toast.error(result.error || "Falha ao enviar");
      }
    } catch (e) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            Telegram Bot
          </CardTitle>
          <CardDescription>
            Envie lembretes, alertas clínicos e mensagens automáticas para pacientes via Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={testConnection} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            {botInfo && (
              <Badge variant="default" className="bg-green-600">
                @{botInfo.username} ✓
              </Badge>
            )}
          </div>

          {botInfo && (
            <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
              <p><strong>Nome:</strong> {botInfo.first_name}</p>
              <p><strong>Username:</strong> @{botInfo.username}</p>
              <p><strong>Bot ID:</strong> {botInfo.id}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Enviar Mensagem de Teste</h4>
            <Input
              placeholder="Chat ID do paciente (ex: 123456789)"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <Textarea
              placeholder="Mensagem para o paciente..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={sendMessage} disabled={sending || !chatId || !message}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Mensagem
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Como usar</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>O paciente inicia conversa com seu bot no Telegram</li>
              <li>O Chat ID do paciente é registrado automaticamente</li>
              <li>O sistema envia lembretes de checklist, alertas e motivações</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FirecrawlSection() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loadingScrape, setLoadingScrape] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const handleScrape = async () => {
    if (!url) { toast.error("Informe uma URL"); return; }
    setLoadingScrape(true);
    setScrapeResult(null);
    try {
      const result = await firecrawlApi.scrape(url, { formats: ['markdown', 'links'] });
      if (result.success !== false) {
        setScrapeResult(result.data || result);
        toast.success("Página extraída com sucesso!");
      } else {
        toast.error(result.error || "Falha ao extrair");
      }
    } catch (e) {
      toast.error("Erro ao extrair página");
    } finally {
      setLoadingScrape(false);
    }
  };

  const handleSearch = async () => {
    if (!query) { toast.error("Informe uma pesquisa"); return; }
    setLoadingSearch(true);
    setSearchResults(null);
    try {
      const result = await firecrawlApi.search(query, { limit: 5, lang: 'pt-br', country: 'BR' });
      if (result.success !== false) {
        setSearchResults(result.data || result);
        toast.success("Pesquisa concluída!");
      } else {
        toast.error(result.error || "Falha na pesquisa");
      }
    } catch (e) {
      toast.error("Erro na pesquisa");
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-orange-500" />
            Firecrawl - Web Scraping
          </CardTitle>
          <CardDescription>
            Extraia dados nutricionais, artigos científicos e tabelas de composição de alimentos da web
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scrape Section */}
          <div className="space-y-3">
            <h4 className="font-medium">Extrair Página</h4>
            <div className="flex gap-2">
              <Input
                placeholder="https://tabela-nutricional.com/alimento"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleScrape} disabled={loadingScrape || !url}>
                {loadingScrape ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              </Button>
            </div>
            {scrapeResult && (
              <div className="rounded-lg border p-3 bg-muted/30 max-h-60 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {scrapeResult.markdown?.substring(0, 2000) || JSON.stringify(scrapeResult, null, 2).substring(0, 2000)}
                </pre>
              </div>
            )}
          </div>

          {/* Search Section */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Pesquisa Web Nutricional</h4>
            <div className="flex gap-2">
              <Input
                placeholder="tabela nutricional batata doce cozida"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loadingSearch || !query}>
                {loadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults && (
              <div className="space-y-2 max-h-80 overflow-auto">
                {(Array.isArray(searchResults) ? searchResults : searchResults?.data || []).map((item: any, i: number) => (
                  <div key={i} className="rounded-lg border p-3 bg-muted/30 text-sm">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {item.title || item.url}
                    </a>
                    <p className="text-muted-foreground mt-1 text-xs line-clamp-2">
                      {item.description || item.markdown?.substring(0, 150)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Casos de uso</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Extrair dados nutricionais de tabelas online</li>
              <li>Buscar artigos científicos sobre nutrição</li>
              <li>Coletar informações de alimentos para enriquecer protocolos</li>
              <li>Pesquisar evidências clínicas para decisões</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
