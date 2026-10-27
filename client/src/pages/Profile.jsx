import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { CalendarDays, KeyRound, Mail, Pencil, Phone, ShieldCheck, User } from 'lucide-react';
import Button from '../components/common/Button';
import { Input, PasswordInput } from '../components/common/FormControls';
import PasswordStrength from '../components/common/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { authService } from '../services/authService';
import { applyServerErrors, getErrorMessage } from '../services/api';
import { formatDateTime } from '../utils/format';
import { NAME_RULES, PASSWORD_RULES, PHONE_RULES } from '../utils/validation';

function EditProfileForm({ user, onDone }) {
  const { setUser } = useAuth();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { name: user.name, phone: user.phone } });
  const onSubmit = async (values) => {
    try {
      const res = await authService.updateProfile(values);
      setUser(res.data.user);
      toast.success('Profile updated');
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(getErrorMessage(err));
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input label="Full name" required autoComplete="name" error={errors.name?.message} {...register('name', NAME_RULES)} />
      <Input label="Phone" type="tel" required autoComplete="tel" error={errors.phone?.message} {...register('phone', PHONE_RULES)} />
      <Input label="Email" value={user.email} disabled hint="Contact us to change the email on your account." readOnly />
      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } = useForm();
  const newPassword = watch('newPassword');
  const onSubmit = async ({ currentPassword, newPassword: next }) => {
    try {
      await authService.changePassword({ currentPassword, newPassword: next });
      toast.success('Password changed. Other devices have been signed out.');
      reset();
    } catch (err) {
      if (err?.response?.data?.error?.code === 'INVALID_PASSWORD') setError('currentPassword', { message: getErrorMessage(err) });
      else if (!applyServerErrors(err, setError)) toast.error(getErrorMessage(err));
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <PasswordInput label="Current password" autoComplete="current-password" required error={errors.currentPassword?.message} {...register('currentPassword', { required: 'Enter your current password' })} />
      <div>
        <PasswordInput label="New password" autoComplete="new-password" required error={errors.newPassword?.message} {...register('newPassword', PASSWORD_RULES)} />
        <PasswordStrength value={newPassword} />
      </div>
      <PasswordInput label="Confirm new password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm', { validate: (v) => v === newPassword || 'Passwords do not match' })} />
      <Button type="submit" loading={isSubmitting}>Update password</Button>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle('My profile');
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const rows = [
    { icon: User, label: 'Name', value: user.name },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone },
    { icon: ShieldCheck, label: 'Account type', value: user.role === 'admin' ? 'Administrator' : 'Guest' },
    { icon: CalendarDays, label: 'Member since', value: formatDateTime(user.createdAt) },
  ];

  return (
    <div className="container-page max-w-4xl py-10 pb-20">
      <h1 className="text-4xl text-navy-950">My profile</h1>
      <p className="mt-2 text-navy-600">Manage your personal details and password.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="details-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="details-heading" className="text-xl text-navy-950">Personal details</h2>
            {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</Button>}
          </div>
          {editing ? (
            <EditProfileForm user={user} onDone={() => setEditing(false)} />
          ) : (
            <dl className="space-y-4">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 text-gold-700" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-navy-500">{label}</dt>
                    <dd className="text-sm font-medium break-all text-navy-900">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="card p-6" aria-labelledby="password-heading">
          <h2 id="password-heading" className="mb-5 flex items-center gap-2 text-xl text-navy-950"><KeyRound className="h-5 w-5 text-gold-700" aria-hidden="true" /> Change password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
