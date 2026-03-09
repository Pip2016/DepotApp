'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CronLog {
  id: string;
  job_name: string;
  status: 'started' | 'completed' | 'failed';
  symbols_total: number;
  symbols_success: number;
  symbols_failed: number;
  details: Array<{ symbol: string; success: boolean; message: string }>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export default function CronLogsPage() {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cron-logs?limit=20');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Erfolgreich
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Fehlgeschlagen
          </Badge>
        );
      case 'started':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Läuft...
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cron Job Logs</h1>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Aktualisieren
        </Button>
      </div>

      {/* Letzter erfolgreicher Run */}
      {logs.length > 0 && logs[0].status === 'completed' && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium">Letzter erfolgreicher Lauf</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(logs[0].started_at)} · {logs[0].symbols_success}/
                  {logs[0].symbols_total} Aktien aktualisiert
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Liste */}
      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardHeader
              className="py-3 cursor-pointer"
              onClick={() =>
                setExpandedLog(expandedLog === log.id ? null : log.id)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusBadge(log.status)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(log.started_at)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-right">
                    <span className="text-green-600">
                      {log.symbols_success} erfolgreich
                    </span>
                    {log.symbols_failed > 0 && (
                      <span className="text-red-600 ml-2">
                        {log.symbols_failed} fehlgeschlagen
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(log.duration_ms)}
                  </span>
                  {expandedLog === log.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedLog === log.id && (
              <CardContent className="pt-0">
                {log.error_message && (
                  <div className="p-3 bg-red-50 rounded mb-3 text-sm text-red-800">
                    {log.error_message}
                  </div>
                )}

                {log.details && log.details.length > 0 && (
                  <div className="space-y-1">
                    {log.details.map((detail, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {detail.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-mono">{detail.symbol}</span>
                        <span className="text-muted-foreground">
                          {detail.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {logs.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Noch keine Cron Jobs ausgef&uuml;hrt.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
