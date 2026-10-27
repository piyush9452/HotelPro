import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, ImagePlus, Link2, Trash2, Upload } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import Button from '../../components/common/Button';
import { Alert, ErrorState, Spinner } from '../../components/common/Feedback';
import { Checkbox, Input, Select, Textarea } from '../../components/common/FormControls';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { applyServerErrors, getErrorMessage } from '../../services/api';
import { roomService } from '../../services/roomService';
import { BED_LABELS, CATEGORY_LABELS } from '../../utils/constants';

const EMPTY = {
  name: '', roomNumber: '', category: 'deluxe', description: '', pricePerNight: '', maxAdults: 2, maxChildren: 0,
  bedType: 'king', beds: 1, size: '', view: '', inventory: 1, amenities: [], isActive: true, featured: false,
};
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const num = (v) => (v === '' || v === null || Number.isNaN(Number(v)) ? undefined : Number(v));

function ImageManager({ room, onChange, pendingUrls, setPendingUrls }) {
  const fileRef = useRef(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const images = room ? room.images : pendingUrls.map((u, i) => ({ _id: `new-${i}`, url: u }));

  const addUrl = async () => {
    try {
      const parsed = new URL(url.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      toast.error('Enter a valid http(s) image URL');
      return;
    }
    if (!room) {
      setPendingUrls((list) => [...list, url.trim()]);
      setUrl('');
      return;
    }
    setBusy(true);
    try {
      const res = await roomService.update(room._id, { images: [...room.images.map(({ url: u, publicId, alt }) => ({ url: u, publicId, alt })), { url: url.trim(), alt: room.name }] });
      onChange(res.data);
      setUrl('');
      toast.success('Image added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (files) => {
    const list = [...files];
    const bad = list.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) {
      toast.error(`${bad.name}: only JPEG, PNG or WebP up to 5 MB`);
      return;
    }
    setBusy(true);
    try {
      const res = await roomService.uploadImages(room._id, list);
      onChange(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (image) => {
    if (!room) {
      setPendingUrls((list) => list.filter((u) => u !== image.url));
      return;
    }
    setBusy(true);
    try {
      const res = await roomService.deleteImage(room._id, image._id);
      onChange(res.data);
      toast.success('Image removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-6">
      <h2 className="text-xl text-navy-950">Photos</h2>
      <p className="mt-1 text-sm text-navy-500">The first photo is used as the cover image. JPEG, PNG or WebP, up to 5 MB each.</p>
      {images.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={img._id} className="group relative overflow-hidden rounded-lg">
              <img src={img.url} alt={img.alt || ''} className="aspect-[4/3] w-full object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 rounded bg-navy-950/80 px-2 py-0.5 text-xs text-white">Cover</span>}
              <button type="button" onClick={() => remove(img)} disabled={busy} className="absolute top-2 right-2 rounded-full bg-white/95 p-1.5 text-red-600 shadow hover:bg-white" aria-label={`Remove photo ${i + 1}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-beige-300 py-8 text-center text-sm text-navy-500">No photos yet</p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <label htmlFor="image-url" className="sr-only">Image URL</label>
          <input id="image-url" type="url" className="field" placeholder="https://… image URL" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
          <Button variant="outline" onClick={addUrl} disabled={!url || busy}><Link2 className="h-4 w-4" aria-hidden="true" /> Add</Button>
        </div>
        {room ? (
          <>
            <input ref={fileRef} type="file" accept={TYPES.join(',')} multiple className="hidden" id="image-upload" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
            <Button variant="primary" onClick={() => fileRef.current?.click()} loading={busy}><Upload className="h-4 w-4" aria-hidden="true" /> Upload photos</Button>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-navy-500"><ImagePlus className="h-4 w-4" aria-hidden="true" /> File uploads are available after the room is created.</p>
        )}
      </div>
    </section>
  );
}

export default function RoomEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  useDocumentTitle(isNew ? 'Add room' : 'Edit room');
  const meta = useAsync(() => roomService.meta(), []);
  const existing = useAsync(() => roomService.adminGet(id), [id], { enabled: !isNew });
  const [room, setRoom] = useState(null);
  const [pendingUrls, setPendingUrls] = useState([]);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: EMPTY });

  useEffect(() => {
    if (existing.data) {
      setRoom(existing.data);
      const { images, _id, createdAt, updatedAt, popularity, ...fields } = existing.data;
      reset({ ...EMPTY, ...fields, size: fields.size ?? '', view: fields.view ?? '' });
    }
  }, [existing.data, reset]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      pricePerNight: num(values.pricePerNight),
      maxAdults: num(values.maxAdults),
      maxChildren: num(values.maxChildren),
      beds: num(values.beds),
      inventory: num(values.inventory),
      size: num(values.size),
      view: values.view?.trim() || undefined,
      amenities: values.amenities || [],
    };
    try {
      if (isNew) {
        const res = await roomService.create({ ...payload, images: pendingUrls.map((url) => ({ url, alt: payload.name })) });
        toast.success('Room created. You can now upload photos.');
        navigate(`/admin/rooms/${res.data._id}`, { replace: true });
      } else {
        const res = await roomService.update(id, payload);
        setRoom(res.data);
        toast.success('Room saved');
        reset(values);
      }
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(getErrorMessage(err));
      else toast.error('Please fix the highlighted fields');
    }
  };

  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;
  if (!isNew && !room) return <Spinner />;

  const numberField = (name, label, opts = {}) => (
    <Input label={label} type="number" inputMode="numeric" required={opts.required !== false} min={opts.min} step={opts.step || 1} error={errors[name]?.message} {...register(name, { required: opts.required === false ? false : `${label} is required`, min: opts.min !== undefined ? { value: opts.min, message: `Minimum is ${opts.min}` } : undefined, max: opts.max ? { value: opts.max, message: `Maximum is ${opts.max}` } : undefined })} />
  );

  return (
    <>
      <Link to="/admin/rooms" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-950"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All rooms</Link>
      <AdminPageHeader
        title={isNew ? 'Add a room type' : room.name}
        description={isNew ? 'Create a bookable room type with its pricing and inventory.' : `Room ${room.roomNumber} · ${room.isActive ? 'Active' : 'Inactive'}`}
        actions={!isNew && <Button variant="outline" size="sm" to={`/admin/bookings?room=${id}`}>Booking history</Button>}
      />

      <div className="space-y-6">
        <form id="room-form" onSubmit={handleSubmit(onSubmit)} className="card space-y-6 p-6" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Room name" required error={errors.name?.message} {...register('name', { required: 'Name is required', minLength: { value: 3, message: 'At least 3 characters' }, maxLength: { value: 100, message: 'At most 100 characters' } })} />
            <Input label="Room number / code" required hint="Unique, e.g. DLX-301" error={errors.roomNumber?.message} {...register('roomNumber', { required: 'Room number is required', pattern: { value: /^[A-Za-z0-9-]{1,20}$/, message: 'Letters, numbers and dashes only' } })} />
            <Select label="Category" required options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} error={errors.category?.message} {...register('category')} />
            {numberField('pricePerNight', 'Price per night (₹)', { min: 1, max: 1000000 })}
          </div>
          <Textarea label="Description" required rows={5} error={errors.description?.message} {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'At least 20 characters' }, maxLength: { value: 3000, message: 'At most 3000 characters' } })} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {numberField('maxAdults', 'Max adults', { min: 1, max: 10 })}
            {numberField('maxChildren', 'Max children', { min: 0, max: 10 })}
            <Select label="Bed type" required options={(meta.data?.bedTypes || Object.keys(BED_LABELS)).map((v) => ({ value: v, label: BED_LABELS[v] }))} {...register('bedType')} />
            {numberField('beds', 'Number of beds', { min: 1, max: 10 })}
            {numberField('inventory', 'Units (inventory)', { min: 1, max: 500 })}
            {numberField('size', 'Size (sq ft)', { min: 0, max: 20000, required: false })}
            <Input label="View" placeholder="e.g. Sea" error={errors.view?.message} {...register('view', { maxLength: { value: 60, message: 'At most 60 characters' } })} />
          </div>

          <fieldset>
            <legend className="label">Amenities</legend>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {(meta.data?.amenities || []).map((a) => <Checkbox key={a} label={a} value={a} {...register('amenities')} />)}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-6 border-t border-beige-200 pt-5">
            <Checkbox label="Active (visible and bookable)" {...register('isActive')} />
            <Checkbox label="Featured on the home page" {...register('featured')} />
          </div>
          {!isNew && <Alert tone="info">Price changes apply to new bookings only. Existing bookings keep the price they were booked at.</Alert>}
          <div className="flex gap-2">
            <Button type="submit" loading={isSubmitting} disabled={!isNew && !isDirty}>{isNew ? 'Create room' : 'Save changes'}</Button>
            <Button variant="outline" to="/admin/rooms">Cancel</Button>
          </div>
        </form>

        <ImageManager room={room} onChange={setRoom} pendingUrls={pendingUrls} setPendingUrls={setPendingUrls} />
      </div>
    </>
  );
}
