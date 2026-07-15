import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { graphqlRequest } from '@/services/graphqlClient';
import UiIcon from '@/Components/UiIcon';
import GarmentIllustration from '@/Components/GarmentIllustration';

const MY_DESIGNS = `query MyDesigns { myDesigns { id title status productId productName updatedAt finalizedAt } }`;
const DELETE_DESIGN = `mutation DeleteDesign($id: ID!) { deleteMyDesign(id: $id) }`;
const LOGOUT = `mutation CustomerLogout { customerLogout }`;

export default function Dashboard() {
    const customer = usePage().props.customer;
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        graphqlRequest(MY_DESIGNS)
            .then((data) => setDesigns(data.myDesigns))
            .catch((error) => toast.error(error.message))
            .finally(() => setLoading(false));
    }, []);

    const remove = async (design) => {
        if (!window.confirm(`Delete “${design.title}”? This cannot be undone.`)) return;
        try {
            await graphqlRequest(DELETE_DESIGN, { id: design.id });
            setDesigns((items) => items.filter((item) => item.id !== design.id));
            toast.success('Design deleted.');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const logout = async () => {
        try {
            await graphqlRequest(LOGOUT);
            router.visit('/login');
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <>
            <Head title="My designs" />
            <Toaster position="top-center" />
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_35%,#f1f5f9_100%)] text-slate-950">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                        <button onClick={() => router.visit('/configurator')} className="flex items-center gap-3 text-left">
                            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-md">3D</span>
                            <span><strong className="block text-sm font-black">My design studio</strong><span className="text-xs text-slate-500">{customer?.email}</span></span>
                        </button>
                        <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><UiIcon name="logout" className="h-4 w-4" />Sign out</button>
                    </div>
                </header>

                <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
                    <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-7 text-white shadow-xl sm:flex-row sm:items-center sm:p-9">
                        <span className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[36px] border-white/5" />
                        <div className="relative"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-blue-100"><UiIcon name="sparkles" className="h-3.5 w-3.5" />Customer workspace</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Hello, {customer?.name}</h1><p className="mt-2 text-sm text-blue-100">Continue a draft or bring a new garment idea to life.</p></div>
                        <button onClick={() => router.visit('/configurator')} className="relative inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"><UiIcon name="plus" className="h-4 w-4" />Create new design</button>
                    </div>

                    <div className="mt-9 flex items-end justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Your work</p><h2 className="mt-2 text-2xl font-black tracking-tight">Saved designs</h2></div>{designs.length > 0 && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">{designs.length} design{designs.length === 1 ? '' : 's'}</span>}</div>

                    {loading ? (
                        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl bg-white" />)}</div>
                    ) : designs.length === 0 ? (
                        <section className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><UiIcon name="shirt" className="h-7 w-7" /></div><h2 className="mt-5 text-xl font-black">Your first design starts here</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Choose a published garment, personalize it, then save it as a draft or finish it.</p><button onClick={() => router.visit('/configurator')} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"><UiIcon name="sparkles" className="h-4 w-4" />Open configurator</button></section>
                    ) : (
                        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {designs.map((design) => <DesignCard key={design.id} design={design} onDelete={() => remove(design)} />)}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

function DesignCard({ design, onDelete }) {
    const final = design.status === 'FINAL';
    const isDress = design.productId?.includes('dress');
    return <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-xl"><button onClick={() => router.visit(`/configurator?design=${design.id}`)} className="block w-full text-left"><div className="relative grid h-44 place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50"><GarmentIllustration type={isDress ? 'dress' : 'shirt'} className="h-40 w-full transition duration-300 group-hover:scale-105" /><span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase shadow-sm ${final ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${final ? 'bg-emerald-500' : 'bg-amber-500'}`} />{final ? 'Finished' : 'Draft'}</span></div><div className="p-5"><h3 className="truncate font-black text-slate-950">{design.title}</h3><p className="mt-1 text-xs text-slate-500">{design.productName}</p><p className="mt-4 text-[11px] text-slate-400">Updated {new Date(design.updatedAt).toLocaleString()}</p></div></button><div className="flex border-t border-slate-100"><button onClick={() => router.visit(`/configurator?design=${design.id}`)} className="flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-xs font-black text-blue-700 hover:bg-blue-50">Open design<UiIcon name="arrow" className="h-4 w-4" /></button><button onClick={onDelete} aria-label={`Delete ${design.title}`} className="border-l border-slate-100 px-4 py-3.5 text-rose-500 hover:bg-rose-50"><UiIcon name="trash" className="h-4 w-4" /></button></div></article>;
}
