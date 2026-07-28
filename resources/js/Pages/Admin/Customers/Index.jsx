import { Link } from '@inertiajs/react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from '../Configurator/AdminShell';

export default function Index({ customers, platformView }) {
    return (
        <AdminShell
            title={platformView ? 'Store customers' : 'My customers'}
            subtitle={platformView
                ? 'Customers are grouped by the Shopify store where they registered.'
                : 'Only customers registered through your store are shown here.'}
        >
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
                <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_130px]">
                    <span>Customer</span>
                    <span className="hidden sm:block">{platformView ? 'Store' : 'Joined'}</span>
                    <span>Designs</span>
                    <span className="hidden sm:block">Joined</span>
                </div>

                {customers.data.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><UiIcon name="users" className="h-7 w-7" /></span>
                        <h2 className="mt-4 text-base font-bold text-slate-950">No registered customers yet</h2>
                        <p className="mt-1 text-sm text-slate-500">Customers will appear after registering through this store’s storefront URL.</p>
                    </div>
                ) : customers.data.map((customer) => (
                    <article key={customer.id} className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_130px]">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-sm font-black text-violet-700">{customer.name.slice(0, 1).toUpperCase()}</span>
                            <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{customer.name}</p><p className="truncate text-xs text-slate-500">{customer.email}</p></div>
                        </div>
                        <p className="hidden truncate text-xs text-slate-500 sm:block">{platformView ? customer.store?.name ?? 'Unknown store' : formatDate(customer.joinedAt)}</p>
                        <span className="w-fit rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{customer.designsCount}</span>
                        <p className="hidden text-xs text-slate-500 sm:block">{formatDate(customer.joinedAt)}</p>
                    </article>
                ))}
            </section>

            {customers.links?.length > 3 && (
                <nav className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Customer pages">
                    {customers.links.map((link, index) => link.url ? (
                        <Link key={index} href={link.url} preserveScroll className={`rounded-xl border px-3 py-2 text-xs font-bold ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                    ) : null)}
                </nav>
            )}
        </AdminShell>
    );
}

function formatDate(value) {
    if (! value) return '—';
    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
