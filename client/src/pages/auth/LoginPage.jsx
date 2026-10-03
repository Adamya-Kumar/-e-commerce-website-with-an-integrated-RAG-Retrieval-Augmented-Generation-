import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard.jsx';
import PasswordField from '../../components/auth/PasswordField.jsx';
import Button from '../../components/ui/Button.jsx';
import { cn } from '../../components/ui/cn.js';
import { useAuth } from '../../context/useAuth.js';
import { safeRedirect } from '../../lib/redirect.js';
import { fieldErrors, loginSchema } from './schemas.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data);
      navigate(safeRedirect(params.get('redirect')) || '/', { replace: true });
    } catch {
      // Toast is raised in AuthContext.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      subtitle="Sign in to your Spark Commerce account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            to={
              params.get('redirect')
                ? `/register?redirect=${encodeURIComponent(params.get('redirect'))}`
                : '/register'
            }
            className="font-semibold text-forest-medium hover:underline"
          >
            Register now
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <label className="mb-5 block" htmlFor="email">
          <span className="mb-2 block text-[0.8rem] font-bold text-main">Email address</span>
          <span className="relative flex items-center">
            <i className="bi bi-envelope pointer-events-none absolute left-5 text-[1.1rem] text-muted-green" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={values.email}
              aria-invalid={Boolean(errors.email) || undefined}
              className={cn(
                'w-full rounded-lg border bg-canvas py-3 pl-11 pr-4 text-[0.9rem] font-semibold text-main outline-none transition duration-200 ease-in-out placeholder:text-placeholder focus:border-forest-medium focus:bg-card focus:shadow-focus',
                errors.email ? 'border-sys-red' : 'border-light',
              )}
              onChange={(event) => update('email', event.target.value)}
            />
          </span>
          {errors.email ? (
            <span className="mt-1.5 block text-xs font-bold text-sys-red">{errors.email}</span>
          ) : null}
        </label>
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          invalid={Boolean(errors.password)}
          message={errors.password}
          onChange={(event) => update('password', event.target.value)}
        />
        <Button type="submit" variant="primary" className="w-full py-3.5" disabled={submitting}>
          <span>{submitting ? 'Signing in' : 'Sign in'}</span>
          <i className="bi bi-arrow-right" />
        </Button>
      </form>
    </AuthCard>
  );
}
