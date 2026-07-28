import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import UiIcon from '@/Components/UiIcon';
import { graphqlRequest } from '@/services/graphqlClient';
import AuthField, { authInputClassName } from './AuthField';
import CustomerAuthShell from './CustomerAuthShell';

const REGISTER = `mutation CustomerRegister($input: CustomerRegisterInput!) { customerRegister(input: $input) { message customer { id name email } } }`;

export default function Register({ intendedUrl, storefront }) {
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault(); setBusy(true); setErrors({});
        try {
            const data = await graphqlRequest(REGISTER, { input: form });
            toast.success(data.customerRegister.message);
            setTimeout(() => router.visit(intendedUrl || storefront.configuratorUrl), 350);
        } catch (error) {
            setErrors(error.fieldErrors ?? {}); toast.error(error.message);
        } finally { setBusy(false); }
    };

    return (
        <><Head title="Create customer account" /><Toaster position="top-center" />
            <CustomerAuthShell eyebrow="Free customer account" title="Save every design" description="Create your private workspace first. Your drafts and finished garments will then follow your account, not one browser.">
                <form onSubmit={submit} className="space-y-4">
                    <AuthField label="Your name" icon="user" error={errors.name?.[0]}><Input value={form.name} onChange={(value) => setForm({ ...form, name: value })} autoComplete="name" placeholder="Your full name" /></AuthField>
                    <AuthField label="Email address" icon="mail" error={errors.email?.[0]}><Input type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} autoComplete="email" placeholder="you@example.com" /></AuthField>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AuthField label="Password" icon="lock" error={errors.password?.[0]}><Input type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} autoComplete="new-password" placeholder="8+ characters" /></AuthField>
                        <AuthField label="Confirm" icon="lock"><Input type="password" value={form.password_confirmation} onChange={(value) => setForm({ ...form, password_confirmation: value })} autoComplete="new-password" placeholder="Repeat password" /></AuthField>
                    </div>
                    <button disabled={busy} className="group mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60">{busy ? 'Creating account…' : 'Create account and start'}{!busy && <UiIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />}</button>
                </form>
                <p className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">Already have an account? <Link href={storefront.loginUrl} className="font-bold text-blue-600 hover:text-blue-700">Sign in</Link></p>
            </CustomerAuthShell>
        </>
    );
}

function Input({ type = 'text', value, onChange, autoComplete, placeholder }) {
    return <input type={type} required value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} className={authInputClassName} />;
}
