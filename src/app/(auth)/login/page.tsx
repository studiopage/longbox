import { Suspense } from 'react';
import { LoginForm } from './login-form';
import { BookOpen, Loader2 } from 'lucide-react';

function LoginLoading() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(160,180,145,0.2) 0%, rgba(160,180,145,0.05) 100%)',
            border: '1px solid rgba(160,180,145,0.15)',
          }}
        >
          <BookOpen className="w-7 h-7" style={{ color: 'rgba(160,180,145,0.7)' }} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#c0c8b8' }}>
            Longbox
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Sign in to your library
          </p>
        </div>
      </div>
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(160,180,145,0.4)' }} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
