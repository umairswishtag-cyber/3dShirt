import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { graphqlRequest } from '@/services/graphqlClient';
import UiIcon from '@/Components/UiIcon';
import GarmentIllustration from '@/Components/GarmentIllustration';
import SavedDesignCard from '@/features/configurator/components/SavedDesignCard';

const MY_DESIGNS = `query MyDesigns { myDesigns { id title status productId productName updatedAt finalizedAt } }`;
const DELETE_DESIGN = `mutation DeleteDesign($id: ID!) { deleteMyDesign(id: $id) }`;
const LOGOUT = `mutation CustomerLogout { customerLogout }`;

export default function Dashboard({ storefront, catalog = [], productionRequests = [] }) {
    const { customer, chatAlerts = {} } = usePage().props;
    const usesShopifyIdentity = customer?.auth_provider === 'shopify';
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewDesignId, setPreviewDesignId] = useState(null);

    useEffect(() => {
        graphqlRequest(MY_DESIGNS)
            .then((data) => setDesigns(data.myDesigns))
            .catch((error) => toast.error(error.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const timer = window.setInterval(
            () =>
                router.reload({
                    only: ['chatAlerts', 'productionRequests'],
                    preserveScroll: true,
                    preserveState: true,
                }),
            15000,
        );
        return () => window.clearInterval(timer);
    }, []);

    const remove = async (design) => {
        if (!window.confirm(`Delete “${design.title}”? This cannot be undone.`)) return;
        try {
            await graphqlRequest(DELETE_DESIGN, { id: design.id });
            setDesigns((items) => items.filter((item) => item.id !== design.id));
            setPreviewDesignId((id) => (id === design.id ? null : id));
            toast.success('Design deleted.');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const logout = async () => {
        if (usesShopifyIdentity) {
            window.top.location.assign(storefront.shopifyAccountUrl);
            return;
        }

        try {
            await graphqlRequest(LOGOUT);
            router.visit(storefront.loginUrl);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const openShopifyStore = () => {
        if (usesShopifyIdentity) {
            window.top.location.assign(storefront.shopifyStoreUrl);
            return;
        }

        router.visit(storefront.configuratorUrl);
    };

    const openConfigurator = (designId = null) => {
        const baseUrl = usesShopifyIdentity ? storefront.shopifyConfiguratorUrl : storefront.configuratorUrl;
        const url = designId ? `${baseUrl}?design=${encodeURIComponent(designId)}` : baseUrl;

        if (usesShopifyIdentity) {
            window.top.location.assign(url);
            return;
        }

        router.visit(url);
    };

    return (
        <>
            <Head title="My designs" />
            <Toaster position="top-center" />
            <div className="min-h-screen bg-[#f8f9fc] text-slate-950">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                        <button onClick={openShopifyStore} className="flex items-center gap-3 text-left">
                            <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 text-base font-black text-white shadow-lg shadow-indigo-500/20">
                                <span className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-white/20 blur-sm" />
                                <span className="relative">3D</span>
                            </span>
                            <span className="hidden sm:block">
                                <strong className="block text-base font-bold tracking-tight">My design studio</strong>
                                <span className="text-xs text-slate-500">{customer?.email}</span>
                            </span>
                        </button>
                        <div className="flex items-center gap-1">
                            <a href="#production-requests" className="relative inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 text-sm font-semibold text-violet-700">
                                <UiIcon name="chat" className="h-4 w-4" />
                                <span className="hidden sm:inline">Orders & messages</span>
                                {chatAlerts.unreadCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">{chatAlerts.unreadCount > 99 ? '99+' : chatAlerts.unreadCount}</span>}
                            </a>
                            <button type="button" className="hidden h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-sm font-semibold text-indigo-700 md:inline-flex">
                                <UiIcon name="bookmark" className="h-4 w-4" />
                                My designs
                            </button>
                            <button onClick={() => openConfigurator()} className="hidden h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 lg:inline-flex">
                                <UiIcon name="plus" className="h-4 w-4" />
                                Create
                            </button>
                            <button onClick={logout} className="inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600">
                                <UiIcon name="logout" className="h-4 w-4" />
                                <span className="hidden sm:inline">Sign out</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                    <div className="relative flex min-h-[250px] flex-col justify-center overflow-hidden rounded-[28px] border border-indigo-100 bg-[linear-gradient(112deg,#fff_0%,#fbfbff_51%,#eef1ff_100%)] p-7 shadow-[0_14px_38px_rgba(49,46,129,0.06)] sm:p-10">
                        <span className="absolute -right-10 top-10 hidden h-36 w-[420px] rounded-[50%] border border-violet-300/60 md:block" />
                        <span className="absolute right-16 top-16 hidden h-28 w-[460px] rounded-[50%] border border-blue-200/70 md:block" />
                        <GarmentIllustration className="pointer-events-none absolute -bottom-10 right-12 hidden h-72 w-80 drop-shadow-[0_22px_28px_rgba(79,70,229,0.16)] md:block" />
                        <div className="relative z-10 max-w-xl">
                            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
                                <UiIcon name="sparkles" className="h-4 w-4" />
                                Customer workspace
                            </span>
                            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-[42px]">Hello, {customer?.name}</h1>
                            <p className="mt-3 text-sm leading-6 text-slate-500">Continue a draft or bring a new garment idea to life in your private design workspace.</p>
                            <button onClick={() => openConfigurator()} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                                <UiIcon name="plus" className="h-4 w-4" />
                                Create new design
                            </button>
                        </div>
                    </div>

                    <section id="production-requests" className="mt-9">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">Custom production</p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight">Requests & quotations</h2>
                                <p className="mt-1 text-sm text-slate-500">Track review, approve quotations, clear payment, and follow printing.</p>
                            </div>
                            {productionRequests.length > 0 && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">{productionRequests.length}</span>}
                        </div>
                        {productionRequests.length === 0 ? (
                            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">Published custom designs can be submitted to the team for technical review and quotation.</div>
                        ) : (
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                {productionRequests.map((item) => (
                                    <button key={item.id} onClick={() => router.visit(item.url)} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-black">{item.designName}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.productName} · Qty {item.quantity}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold capitalize text-indigo-700">{item.status.replaceAll('_', ' ')}</span>
                                        </div>
                                        {item.unreadMessages > 0 && (
                                            <span className="mt-4 inline-flex rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white">
                                                {item.unreadMessages} new message
                                                {item.unreadMessages === 1 ? '' : 's'}
                                            </span>
                                        )}
                                        {item.quote && (
                                            <p className="mt-4 text-sm font-black">
                                                {item.quote.currency} {item.quote.total}
                                            </p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="mt-9 flex items-end justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">Your work</p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight">Saved designs</h2>
                            <p className="mt-1 text-sm text-slate-500">Everything you have saved, ready to continue.</p>
                        </div>
                        {designs.length > 0 && (
                            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
                                {designs.length} design
                                {designs.length === 1 ? '' : 's'}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-80 animate-pulse rounded-3xl bg-white" />
                            ))}
                        </div>
                    ) : designs.length === 0 ? (
                        <section className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-16 text-center shadow-sm">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <UiIcon name="shirt" className="h-8 w-8" />
                            </div>
                            <h2 className="mt-5 text-xl font-black">Your first design starts here</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose a published garment, personalize it, then save it as a draft or publish it.</p>
                            <button onClick={() => openConfigurator()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                                <UiIcon name="sparkles" className="h-4 w-4" />
                                Open configurator
                            </button>
                        </section>
                    ) : (
                        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {designs.map((design) => {
                                return <SavedDesignCard key={design.id} design={design} catalog={catalog} previewActive={previewDesignId === design.id} onTogglePreview={() => setPreviewDesignId((id) => (id === design.id ? null : design.id))} onOpen={() => openConfigurator(design.id)} onDelete={() => remove(design)} />;
                            })}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
