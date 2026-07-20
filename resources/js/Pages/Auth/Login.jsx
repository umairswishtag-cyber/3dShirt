import GuestLayout from '@/Layouts/NonEmbedded/GuestLayout';
import UiIcon from '@/Components/UiIcon';
import { Head, Link, useForm } from '@inertiajs/react';

const inputClassName = 'h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Admin sign in" />

            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700"><UiIcon name="sparkles" className="h-3.5 w-3.5" />Admin access</span>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">Welcome back</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to manage your 3D catalog, product options, and storefront experience.</p>

            {status && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{status}</div>}

            <form onSubmit={submit} className="mt-8 space-y-5">
                <Field label="Email address" icon="mail" error={errors.email}>
                    <input id="email" type="email" name="email" value={data.email} className={inputClassName} autoComplete="username" autoFocus onChange={(event) => setData('email', event.target.value)} placeholder="admin@example.com" />
                </Field>

                <Field label="Password" icon="lock" error={errors.password}>
                    <input id="password" type="password" name="password" value={data.password} className={inputClassName} autoComplete="current-password" onChange={(event) => setData('password', event.target.value)} placeholder="Enter your password" />
                </Field>

                <div className="flex items-center justify-between gap-4">
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600"><input type="checkbox" name="remember" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />Remember me</label>
                    {canResetPassword && <Link href={route('password.request')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Forgot password?</Link>}
                </div>

                <button disabled={processing} className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60">{processing ? 'Signing in…' : 'Sign in to dashboard'}{!processing && <UiIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />}</button>
            </form>
        </GuestLayout>
    );
}

function Field({ label, icon, error, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-700">{label}</span>
            <span className={`relative block rounded-xl ${error ? 'ring-1 ring-rose-300' : ''}`}><UiIcon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />{children}</span>
            {error && <span className="mt-1.5 block text-xs font-semibold text-rose-600">{error}</span>}
        </label>
    );
}
