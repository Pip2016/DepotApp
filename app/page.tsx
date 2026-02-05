'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  PieChart,
  FileSpreadsheet,
  Shield,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null; // Redirect is happening
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-xl bg-primary p-2">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">MyDepot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Anmelden</Button>
            </Link>
            <Link href="/signup">
              <Button>Kostenlos starten</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Dein Portfolio.{' '}
            <span className="text-primary">Deine Kontrolle.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Verwalte deine Aktien und ETFs an einem Ort. Mit Echtzeit-Kursen,
            übersichtlichen Charts und einfachem CSV-Import von Comdirect,
            Postbank und anderen Brokern.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Jetzt starten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Ich habe bereits ein Konto
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Alles was du brauchst
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8" />}
                title="Echtzeit-Kurse"
                description="Aktuelle Kurse von mehreren Datenquellen mit automatischem Fallback."
              />
              <FeatureCard
                icon={<PieChart className="h-8 w-8" />}
                title="Portfolio-Analyse"
                description="Übersichtliche Charts zur Visualisierung deiner Allokation und Performance."
              />
              <FeatureCard
                icon={<FileSpreadsheet className="h-8 w-8" />}
                title="CSV-Import"
                description="Importiere deine Transaktionen einfach aus CSV-Exporten deines Brokers."
              />
              <FeatureCard
                icon={<Shield className="h-8 w-8" />}
                title="Sicher & Privat"
                description="Deine Daten gehören dir. Sichere Authentifizierung mit Supabase."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MyDepot. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center">
      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
