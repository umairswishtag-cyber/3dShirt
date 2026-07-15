import { Link } from '@inertiajs/react';
import GarmentIllustration from '@/Components/GarmentIllustration';
import UiIcon from '@/Components/UiIcon';

export default function CustomerAuthShell({ eyebrow, title, description, children }) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f6f8fc] px-4 py-6 text-slate-950 sm:grid sm:place-items-center sm:px-6 sm:py-10">
            <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-100/60 blur-3xl" />
            <div className="relative mx-auto grid w-full min-w-0 max-w-6xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_32px_90px_rgba(15,23,42,0.13)] lg:min-h-[680px] lg:grid-cols-[1fr_1.05fr]">
                <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#172554] via-[#1d4ed8] to-[#0891b2] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
                    <span className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[48px] border-white/5" />
                    <span className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border-[42px] border-white/5" />
                    <Link href="/" className="relative flex items-center gap-3 font-bold">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-blue-700 shadow-lg shadow-blue-950/15">3D</span>
                        <span><strong className="block text-sm">Your design studio</strong><span className="mt-0.5 block text-[11px] font-medium text-blue-100">Create · Save · Continue</span></span>
                    </Link>
                    <div className="relative my-8">
                        <div className="mx-auto max-w-sm rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm"><GarmentIllustration className="w-full" /></div>
                        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Designed around your ideas</p>
                        <h2 className="mt-3 max-w-md text-3xl font-black leading-tight tracking-tight">Your garment work, always within reach.</h2>
                        <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">Save drafts, return from any device, and keep every finished shirt or dress organized in one private workspace.</p>
                    </div>
                    <div className="relative flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-blue-50">
                        <span className="inline-flex items-center gap-2"><UiIcon name="check" className="h-4 w-4 text-cyan-300" />Private designs</span>
                        <span className="inline-flex items-center gap-2"><UiIcon name="check" className="h-4 w-4 text-cyan-300" />Continue anytime</span>
                    </div>
                </section>
                <main className="flex min-w-0 items-center p-6 sm:p-10 lg:p-14 xl:p-16">
                    <div className="mx-auto w-full min-w-0 max-w-md">
                        <div className="mb-9 flex items-center justify-between lg:hidden">
                            <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">3D</span><span className="text-sm font-black">Design studio</span></Link>
                            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">Customer</span>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700"><UiIcon name="sparkles" className="h-3.5 w-3.5" />{eyebrow}</span>
                        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
                        <p className="mt-3 break-words text-sm leading-6 text-slate-500">{description}</p>
                        <div className="mt-8">{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}
