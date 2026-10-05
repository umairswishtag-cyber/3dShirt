import { Link, router } from '@inertiajs/react';
import AdminShell from './AdminShell';

export default function ClothMotionSettings({ canManageAccess, canConfigureClothMotion, stores = [], products = [] }) {
    return <AdminShell title="Cloth motion settings">
        <h1 className="text-2xl font-bold">Cloth motion settings</h1>
        <p className="mt-2 text-sm text-slate-500">Grant vendor access and adjust motion separately for each product.</p>
        {canManageAccess && <section className="mt-6 rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Vendor access</h2>
            <p className="mt-1 text-xs text-slate-500">Turning access off pauses motion on that vendor’s storefront and keeps their product settings.</p>
            <div className="mt-4 divide-y">{stores.map((store) => <label key={store.id} className="flex items-center justify-between gap-4 py-3">
                <span><span className="block text-sm font-bold">{store.name}</span><span className="text-xs text-slate-500">{store.email}</span></span>
                <span className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={store.can_configure_cloth_motion} onChange={(e) => router.patch(route('admin.configurator.motion.access', store.id), { can_configure_cloth_motion: e.target.checked }, { preserveScroll: true })} />Allow cloth motion</span>
            </label>)}</div>
        </section>}
        {!canManageAccess && !canConfigureClothMotion && <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Ask your super admin to enable cloth motion access for your vendor account.</p>}
        <section className="mt-6 rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Product motion settings</h2>
            {products.length === 0 && <p className="mt-3 text-sm text-slate-500">Create a product to configure its cloth motion.</p>}
            <div className="mt-3 divide-y">{products.map((product) => <div key={product.id} className="flex items-center justify-between gap-4 py-3">
                <div><p className="text-sm font-bold">{product.name}</p><p className="text-xs text-slate-500">{canManageAccess ? `${product.owner ?? 'No vendor'} · ` : ''}{!product.access ? 'Access disabled' : product.enabled ? 'Sway enabled' : 'Sway off'}</p></div>
                {(canManageAccess || canConfigureClothMotion) && <Link href={`${route('admin.configurator.products.edit', product.id)}#cloth-motion`} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Adjust motion</Link>}
            </div>)}</div>
        </section>
    </AdminShell>;
}
