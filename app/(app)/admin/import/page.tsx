'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface StockStatus {
  symbol: string;
  name: string | null;
  is_active: boolean;
  dataPoints: number;
  latestDate: string | null;
  latestClose: number | null;
}

interface ImportResult {
  success: boolean;
  symbol: string;
  imported?: number;
  error?: string;
  time?: string;
}

export default function ImportPage() {
  // Single Import State
  const [symbol, setSymbol] = useState('');
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);

  // Bulk Import State
  const [bulkSymbols, setBulkSymbols] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Stock Status State
  const [stocks, setStocks] = useState<StockStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);

  // Import Results
  const [results, setResults] = useState<ImportResult[]>([]);

  // Stock Status laden
  const fetchStockStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/stock-status');
      const data = await res.json();
      setStocks(data.stocks || []);
    } catch (e) {
      console.error('Failed to fetch stock status:', e);
    }
    setStatusLoading(false);
  };

  useEffect(() => {
    fetchStockStatus();
  }, []);

  // Single Auto-Import
  const handleAutoImport = async () => {
    if (!symbol) return;
    setLoading(true);

    try {
      const res = await fetch('/api/eod/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, autoDownload: true }),
      });

      const result = await res.json();
      setResults((prev) => [
        { symbol, ...result, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);

      if (result.success) {
        alert(`${symbol}: ${result.imported} Datenpunkte importiert`);
        fetchStockStatus();
      } else {
        alert(`${symbol}: ${result.error}`);
      }
    } catch (e) {
      alert('Fehler beim Import');
    }

    setLoading(false);
    setSymbol('');
  };

  // CSV Import
  const handleCSVImport = async () => {
    if (!symbol || !csv) return;
    setLoading(true);

    try {
      const res = await fetch('/api/eod/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, csv }),
      });

      const result = await res.json();
      setResults((prev) => [
        { symbol, ...result, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);

      if (result.success) {
        alert(`${symbol}: ${result.imported} Datenpunkte importiert`);
        setCsv('');
        fetchStockStatus();
      } else {
        alert(`${symbol}: ${result.error}`);
      }
    } catch (e) {
      alert('Fehler beim CSV Import');
    }

    setLoading(false);
  };

  // Bulk Import
  const handleBulkImport = async () => {
    const symbols = bulkSymbols
      .split(/[\n,;]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    if (symbols.length === 0) {
      alert('Keine Symbole eingegeben');
      return;
    }

    if (symbols.length > 20) {
      alert('Max 20 Symbole gleichzeitig');
      return;
    }

    setBulkLoading(true);

    try {
      const res = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });

      const data = await res.json();

      // Ergebnisse hinzufügen
      const newResults = data.results.map((r: ImportResult) => ({
        ...r,
        time: new Date().toLocaleTimeString(),
      }));
      setResults((prev) => [...newResults, ...prev]);

      alert(
        `Bulk Import: ${data.success} erfolgreich, ${data.failed} fehlgeschlagen`
      );

      setBulkSymbols('');
      fetchStockStatus();
    } catch (e) {
      alert('Bulk Import fehlgeschlagen');
    }

    setBulkLoading(false);
  };

  // Einzelne Aktie updaten
  const handleUpdateSingle = async (sym: string) => {
    setLoading(true);

    try {
      const res = await fetch('/api/eod/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, autoDownload: true }),
      });

      const result = await res.json();

      if (result.success) {
        alert(`${sym} aktualisiert`);
        fetchStockStatus();
      } else {
        alert(`${sym}: ${result.error}`);
      }
    } catch (e) {
      alert('Fehler beim Update');
    }

    setLoading(false);
  };

  // File Handler
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsv(event.target?.result as string);
      const name = file.name.replace('.csv', '').toUpperCase();
      if (!symbol) setSymbol(name);
    };
    reader.readAsText(file);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Historische Daten Import</h1>

      <Tabs defaultValue="status">
        <TabsList className="mb-6">
          <TabsTrigger value="status">
            <Database className="w-4 h-4 mr-2" />
            Daten-Status
          </TabsTrigger>
          <TabsTrigger value="single">
            <Download className="w-4 h-4 mr-2" />
            Einzelimport
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        {/* STATUS TAB */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Aktien mit Daten</CardTitle>
                  <CardDescription>
                    Übersicht aller importierten Aktien
                  </CardDescription>
                </div>
                <Button onClick={fetchStockStatus} variant="outline" size="sm">
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`}
                  />
                  Aktualisieren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stocks.length === 0 && !statusLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  Noch keine Daten importiert. Starte mit dem Einzelimport oder
                  Bulk Import.
                </p>
              ) : (
                <div className="space-y-2">
                  {stocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-mono font-medium">
                            {stock.symbol}
                          </span>
                          {stock.name && (
                            <span className="text-sm text-muted-foreground ml-2">
                              {stock.name}
                            </span>
                          )}
                        </div>
                        {stock.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Aktiv
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-sm text-right">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Database className="w-3 h-3" />
                            {stock.dataPoints} Datenpunkte
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(stock.latestDate)}
                          </div>
                        </div>

                        {stock.latestClose && (
                          <div className="text-right min-w-[80px]">
                            <div className="font-medium">
                              {stock.latestClose.toFixed(2)} EUR
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateSingle(stock.symbol)}
                          disabled={loading}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SINGLE IMPORT TAB */}
        <TabsContent value="single">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Import</CardTitle>
                <CardDescription>
                  Lädt Daten automatisch von Yahoo Finance oder Stooq
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
                </div>
                <Button onClick={handleAutoImport} disabled={loading || !symbol}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Daten laden
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CSV Upload</CardTitle>
                <CardDescription>
                  Lade eine CSV Datei von Yahoo Finance oder Stooq hoch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-symbol">Symbol</Label>
                  <Input
                    id="csv-symbol"
                    placeholder="Symbol"
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
                    onChange={handleFile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="csv">Oder CSV hier einfügen</Label>
                  <Textarea
                    id="csv"
                    placeholder="CSV Inhalt..."
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCSVImport}
                    disabled={loading || !symbol || !csv}
                  >
                    {loading ? (
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
                    Yahoo
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
          </div>
        </TabsContent>

        {/* BULK IMPORT TAB */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>
                Mehrere Symbole gleichzeitig importieren (max. 20)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk">Symbole</Label>
                <Textarea
                  id="bulk"
                  placeholder="Symbole eingeben (ein Symbol pro Zeile oder kommagetrennt):&#10;AAPL&#10;MSFT&#10;SAP.DE&#10;BMW.DE"
                  value={bulkSymbols}
                  onChange={(e) => setBulkSymbols(e.target.value.toUpperCase())}
                  rows={8}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {bulkSymbols.split(/[\n,;]/).filter((s) => s.trim()).length}{' '}
                  Symbole erkannt
                </p>
                <Button onClick={handleBulkImport} disabled={bulkLoading}>
                  {bulkLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Alle importieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Results */}
      {results.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Import Ergebnisse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded ${r.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}
                >
                  {r.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-mono font-medium">{r.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.success ? `${r.imported} Datenpunkte` : r.error}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {r.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
