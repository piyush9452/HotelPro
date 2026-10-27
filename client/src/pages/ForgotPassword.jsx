import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MailCheck } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/common/Button';
import { Alert } from '../components/common/Feedback';
import { Input } from '../components/common/FormControls';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { authService } from '../services/authService';
import { getErrorMessage } from '../services/api';
import { EMAIL_RULES } from '../utils/validation';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const [sentTo, setSentTo] = useState('');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      await authService.forgotPassword({ email });
      setSentTo(email);
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you signed up with and we’ll send you a secure reset link."
      footer={<Link to="/login" className="font-semibold text-gold-700 hover:underline">Back to sign in</Link>}
    >
      {sentTo ? (
        <div className="card p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-gold-600" aria-hidden="true" />
          <h2 className="mt-3 text-xl text-navy-950">Check your inbox</h2>
          <p className="mt-2 text-sm text-navy-600">
            If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It expires in 30 minutes.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => setSentTo('')}>Use a different email</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
          <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email', EMAIL_RULES)} />
          <Button type="submit" size="lg" block loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
