import { SignUpForm } from '@/components/auth/SignUpForm';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Registrieren - MyDepot',
  description: 'Erstelle ein kostenloses MyDepot-Konto',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-xl bg-primary p-2">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">MyDepot</span>
          </Link>
          <p className="text-muted-foreground text-center">
            Dein persönlicher Portfolio-Tracker
          </p>
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}
