import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/common/Button';
import { Alert } from '../components/common/Feedback';
import { PasswordInput } from '../components/common/FormControls';
import PasswordStrength from '../components/common/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { authService } from '../services/authService';
import { getErrorMessage } from '../services/api';
import { PASSWORD_RULES } from '../utils/validation';

export default function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm();
  const password = watch('password');
  const tokenLooksValid = /^[a-f0-9]{64}$/.test(token);

  const onSubmit = async ({ password: newPassword }) => {
    try {
      const res = await authService.resetPassword({ token, password: newPassword });
      setUser(null);
      toast.success(res.message);
      navigate('/login', { replace: true });
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="For your security, this will sign you out on all devices.">
      {!tokenLooksValid ? (
        <Alert tone="error" title="Invalid reset link">
          This link is incomplete or has expired. <Link to="/forgot-password" className="font-semibold underline">Request a new one</Link>.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {errors.root && (
            <Alert tone="error">
              {errors.root.message} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link>
            </Alert>
          )}
          <div>
            <PasswordInput label="New password" autoComplete="new-password" required error={errors.password?.message} {...register('password', PASSWORD_RULES)} />
            <PasswordStrength value={password} />
          </div>
          <PasswordInput label="Confirm new password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm', { validate: (v) => v === password || 'Passwords do not match' })} />
          <Button type="submit" size="lg" block loading={isSubmitting}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
