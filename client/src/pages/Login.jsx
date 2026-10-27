import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/common/Button';
import { Alert } from '../components/common/Feedback';
import { Input, PasswordInput } from '../components/common/FormControls';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../services/api';
import { EMAIL_RULES } from '../utils/validation';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    try {
      const res = await login(values);
      toast.success(res.message || 'Welcome back!');
      const fallback = res.data.user.role === 'admin' ? '/admin' : '/';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your bookings and check out faster."
      footer={<>New to HotelPro? <Link to="/register" state={location.state} className="font-semibold text-gold-700 hover:underline">Create an account</Link></>}
    >
      {location.state?.from && <Alert tone="info" className="mb-5">Please sign in to continue.</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
        <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email', EMAIL_RULES)} />
        <div>
          <PasswordInput autoComplete="current-password" required error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-gold-700 hover:underline">Forgot password?</Link>
          </div>
        </div>
        <Button type="submit" size="lg" block loading={isSubmitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
