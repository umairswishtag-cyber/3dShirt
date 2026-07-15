import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import UiIcon from '@/Components/UiIcon';
import { graphqlRequest } from '@/services/graphqlClient';
import AuthField, { authInputClassName } from './AuthField';
import CustomerAuthShell from './CustomerAuthShell';

const LOGIN = `mutation CustomerLogin($input: CustomerLoginInput!) { customerLogin(input: $input) { message customer { id name email } } }`;

export default function Login({ intendedUrl }) {
    const [form, setForm] = useState({ email: '', password: '', remember: false });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault(); setBusy(true); setErrors({});
        try {
            const data = await graphqlRequest(LOGIN, { input: form });
            toast.success(data.customerLogin.message);
            setTimeout(() => router.visit(intendedUrl || '/configurator'), 350);
        } catch (error) {
            setErrors(error.fieldErrors ?? {}); toast.error(error.message);
        } finally { setBusy(false); }
    };

    return (
        <><Head title="Customer sign in" /><Toaster position="top-center" />
            <CustomerAuthShell eyebrow="Welcome back" title="Continue your designs" description="Sign in before opening the configurator so every saved shirt or dress stays in your account.">
                <form onSubmit={submit} className="space-y-5">
                    <AuthField label="Email address" icon="mail" error={errors.email?.[0]}><input type="email" required autoFocus autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={authInputClassName} /></AuthField>
                    <AuthField label="Password" icon="lock" error={errors.password?.[0]}><input type="password" required autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={authInputClassName} /></AuthField>
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Keep me signed in</label>
                    <button disabled={busy} className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in and continue'}{!busy && <UiIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />}</button>
                </form>
                <p className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">New here? <Link href="/register" className="font-bold text-blue-600 hover:text-blue-700">Create your account</Link></p>
            </CustomerAuthShell>
        </>
    );
}
