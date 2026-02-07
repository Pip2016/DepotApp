'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  symbol: string;
  recordsImported: number;
  error?: string;
  dateRange?: { from: string; to: string };
}

export default function ImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [results, setResults] = useState<ImportResult[]>([]);

  // Auto-Import für ein Symbol
  const handleAutoImport = async () => {
    if (!symbol.trim()) {
      alert('Bitte Symbol eingeben');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/import/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });

      const result = await response.json();
      setResults((prev) => [result, ...prev]);

      if (result.success) {
        alert(
          `Import erfolgreich: ${result.recordsImported} Datensätze für ${result.symbol}`
        );
      } else {
        alert(`Import fehlgeschlagen: ${result.error}`);
      }
    } catch (error) {
      alert('Import konnte nicht gestartet werden');
    } finally {
      setIsLoading(false);
    }
  };

  // CSV Upload
  const handleCSVUpload = async () => {
    if (!symbol.trim() || !csvContent.trim()) {
      alert('Symbol und CSV Inhalt erforderlich');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/import/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          csvContent,
          source: 'manual',
        }),
      });

      const result = await response.json();
      setResults((prev) => [result, ...prev]);

      if (result.success) {
        alert(`CSV Import erfolgreich: ${result.recordsImported} Datensätze`);
        setCsvContent('');
      } else {
        alert(`Import fehlgeschlagen: ${result.error}`);
      }
    } catch (error) {
      alert('CSV Import fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      // Symbol aus Dateiname extrahieren (z.B. "AAPL.csv")
      const fileName = file.name.replace('.csv', '').toUpperCase();
      if (!symbol && fileName.match(/^[A-Z0-9.]+$/)) {
        setSymbol(fileName);
      }
    };
    reader.readAsText(file);
  };

  // Bulk Import für mehrere Symbole
  const handleBulkImport = async () => {
    const symbols = symbol
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s);

    if (symbols.length === 0) {
      alert('Bitte mindestens ein Symbol eingeben');
      return;
    }

    setIsLoading(true);

    for (const sym of symbols) {
      try {
        const response = await fetch('/api/import/historical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: sym }),
        });

        const result = await response.json();
        setResults((prev) => [result, ...prev]);
      } catch {
        setResults((prev) => [
          { success: false, symbol: sym, recordsImported: 0, error: 'Fehler' },
          ...prev,
        ]);
      }

      // Rate Limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    setIsLoading(false);
    alert(`Bulk Import abgeschlossen für ${symbols.length} Symbole`);
  };

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Historische Daten Import</h1>
      <p className="text-muted-foreground mb-8">
        Importiere Kursdaten von Yahoo Finance, Stooq oder per CSV-Upload
      </p>

      <Tabs defaultValue="auto">
        <TabsList className="mb-6">
          <TabsTrigger value="auto">
            <Download className="w-4 h-4 mr-2" />
            Auto-Import
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Download className="w-4 h-4 mr-2" />
            Bulk-Import
          </TabsTrigger>
          <TabsTrigger value="csv">
            <Upload className="w-4 h-4 mr-2" />
            CSV Upload
          </TabsTrigger>
        </TabsList>

        {/* Auto-Import Tab */}
        <TabsContent value="auto">
          <Card>
            <CardHeader>
              <CardTitle>Automatischer Import</CardTitle>
              <CardDescription>
                Lädt historische Daten automatisch von Yahoo Finance oder Stooq
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="z.B. AAPL, SAP.DE, MSFT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
                <p className="text-sm text-muted-foreground">
                  Für deutsche Aktien .DE anhängen (z.B. SAP.DE, ALV.DE)
                </p>
              </div>

              <Button onClick={handleAutoImport} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Daten laden
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>
                Importiere mehrere Symbole auf einmal (kommagetrennt)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbols-bulk">Symbole (kommagetrennt)</Label>
                <Textarea
                  id="symbols-bulk"
                  placeholder="AAPL, MSFT, GOOGL, SAP.DE, ALV.DE"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Mehrere Symbole mit Komma trennen. Der Import dauert ca. 2
                  Sekunden pro Symbol.
                </p>
              </div>

              <Button onClick={handleBulkImport} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Alle importieren
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Upload Tab */}
        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle>CSV Upload</CardTitle>
              <CardDescription>
                Lade eine CSV Datei von Yahoo Finance oder Stooq hoch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol-csv">Symbol</Label>
                <Input
                  id="symbol-csv"
                  placeholder="z.B. AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">CSV Datei</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv">Oder CSV Inhalt einfügen</Label>
                <Textarea
                  id="csv"
                  placeholder="Date,Open,High,Low,Close,Adj Close,Volume&#10;2024-01-02,185.12,..."
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCSVUpload} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  CSV Importieren
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    window.open('https://finance.yahoo.com', '_blank')
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Yahoo Finance
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.open('https://stooq.com', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Stooq
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Results */}
      {results.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Import Ergebnisse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{result.symbol}</p>
                      {result.success ? (
                        <p className="text-sm text-muted-foreground">
                          {result.recordsImported} Datensätze
                          {result.dateRange &&
                            ` (${result.dateRange.from} - ${result.dateRange.to})`}
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hilfe */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Anleitung: CSV Download</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Yahoo Finance:</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Gehe zu finance.yahoo.com</li>
              <li>Suche nach der Aktie (z.B. &quot;AAPL&quot;)</li>
              <li>Klicke auf &quot;Historical Data&quot;</li>
              <li>Wähle &quot;Max&quot; als Time Period</li>
              <li>Klicke auf &quot;Download&quot;</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Stooq:</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Gehe zu stooq.com</li>
              <li>Suche nach der Aktie (z.B. &quot;SAP.DE&quot;)</li>
              <li>Klicke auf &quot;Historical data&quot;</li>
              <li>Klicke auf &quot;Download&quot; (CSV)</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Symbole für deutsche Aktien:</h4>
            <p className="text-sm text-muted-foreground">
              SAP.DE, ALV.DE (Allianz), BMW.DE, SIE.DE (Siemens), BAS.DE (BASF),
              DTE.DE (Telekom), VOW3.DE (VW), MRK.DE (Merck)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
