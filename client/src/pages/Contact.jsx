import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import { Input, Textarea } from '../components/common/FormControls';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { contactService } from '../services/contactService';
import { applyServerErrors, getErrorMessage } from '../services/api';
import { HOTEL } from '../utils/constants';
import { EMAIL_RULES, NAME_RULES } from '../utils/validation';

export default function Contact() {
  useDocumentTitle('Contact us');
  const { user } = useAuth();
  const { register, handleSubmit, reset, setError, getValues, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: user?.name || '', email: user?.email || '', phone: user?.phone || '', subject: '', message: '' },
  });

  // The session may finish loading after the first render (e.g. on a full page load);
  // fill in the signed-in user's details then, without overwriting anything typed.
  useEffect(() => {
    if (!user) return;
    for (const [field, value] of [['name', user.name], ['email', user.email], ['phone', user.phone]]) {
      if (!getValues(field) && value) setValue(field, value);
    }
  }, [user, getValues, setValue]);

  const onSubmit = async (values) => {
    try {
      const res = await contactService.send(values);
      toast.success(res.message);
      reset({ ...values, subject: '', message: '' });
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(getErrorMessage(err));
    }
  };

  const info = [
    { icon: MapPin, label: 'Address', value: HOTEL.address },
    { icon: Phone, label: 'Reservations', value: HOTEL.phone, href: `tel:${HOTEL.phone.replace(/\s/g, '')}` },
    { icon: Mail, label: 'Email', value: HOTEL.email, href: `mailto:${HOTEL.email}` },
    { icon: Clock, label: 'Front desk', value: 'Open 24 hours, every day' },
  ];

  return (
    <>
      <PageHero eyebrow="Contact" title="We’re here to help" subtitle="Questions about a booking, events or special requests? Send us a message and our team will reply within 24 hours." image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=2000&q=70" />
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {info.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="card flex gap-4 p-5">
              <span className="h-fit rounded-xl bg-navy-950 p-3 text-gold-400"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-semibold tracking-wider text-navy-500 uppercase">{label}</p>
                {href ? <a href={href} className="mt-1 block font-medium text-navy-900 hover:underline">{value}</a> : <p className="mt-1 font-medium text-navy-900">{value}</p>}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 p-6 sm:p-8" noValidate>
          <h2 className="text-2xl text-navy-950">Send us a message</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Your name" required autoComplete="name" error={errors.name?.message} {...register('name', NAME_RULES)} />
            <Input label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email', EMAIL_RULES)} />
            <Input label="Phone" type="tel" autoComplete="tel" hint="Optional" error={errors.phone?.message} {...register('phone', { pattern: { value: /^(\+?[0-9\s-]{7,20})?$/, message: 'Enter a valid phone number' } })} />
            <Input label="Subject" required error={errors.subject?.message} {...register('subject', { required: 'Subject is required', minLength: { value: 3, message: 'At least 3 characters' }, maxLength: { value: 150, message: 'At most 150 characters' } })} />
          </div>
          <Textarea label="Message" required rows={6} error={errors.message?.message} {...register('message', { required: 'Message is required', minLength: { value: 10, message: 'Please write at least 10 characters' }, maxLength: { value: 3000, message: 'At most 3000 characters' } })} />
          <Button type="submit" size="lg" loading={isSubmitting}><Send className="h-4 w-4" aria-hidden="true" /> Send message</Button>
        </form>
      </div>
    </>
  );
}
