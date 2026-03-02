import { Suspense } from 'react';
import { LoginForm } from './login-form';
import { Book, Loader2 } from 'lucide-react';

function LoginLoading() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded flex items-center justify-center">
            <Book className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Longbox</h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
