import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/common/Button';
import { Alert } from '../components/common/Feedback';
import { Input, PasswordInput } from '../components/common/FormControls';
import PasswordStrength from '../components/common/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { applyServerErrors, getErrorMessage } from '../services/api';
import { EMAIL_RULES, NAME_RULES, PASSWORD_RULES, PHONE_RULES } from '../utils/validation';

export default function Register() {
  useDocumentTitle('Create account');
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });
  const password = watch('password');

  const onSubmit = async ({ confirmPassword, ...values }) => {
    try {
      const res = await signUp(values);
      toast.success(res.message || 'Account created');
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError, ['name', 'email', 'phone', 'password'])) setError('root', { message: getErrorMessage(err) });
      else if (err?.response?.status === 409) setError('email', { message: getErrorMessage(err) });
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book faster, manage reservations and keep your stays in one place."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-semibold text-gold-700 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
        <Input label="Full name" autoComplete="name" required error={errors.name?.message} {...register('name', NAME_RULES)} />
        <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email', EMAIL_RULES)} />
        <Input label="Phone" type="tel" autoComplete="tel" required placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone', PHONE_RULES)} />
        <div>
          <PasswordInput autoComplete="new-password" required hint="At least 8 characters, with upper and lower case letters and a number." error={errors.password?.message} {...register('password', PASSWORD_RULES)} />
          <PasswordStrength value={password} />
        </div>
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', { required: 'Please confirm your password', validate: (v) => v === password || 'Passwords do not match' })}
        />
        <p className="text-xs text-navy-500">
          By creating an account you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.
        </p>
        <Button type="submit" size="lg" block loading={isSubmitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
