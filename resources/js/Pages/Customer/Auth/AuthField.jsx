import UiIcon from '@/Components/UiIcon';

export default function AuthField({ label, icon, error, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
            <span className={`flex min-h-12 items-center rounded-2xl border bg-slate-50/80 px-4 transition focus-within:bg-white focus-within:ring-4 ${error ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100' : 'border-slate-200 focus-within:border-blue-400 focus-within:ring-blue-100'}`}>
                <UiIcon name={icon} className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
                {children}
            </span>
            {error && <span className="mt-1.5 block text-xs font-semibold text-rose-600">{error}</span>}
        </label>
    );
}

export const authInputClassName = 'min-w-0 flex-1 !border-0 bg-transparent px-0 py-3 text-sm text-slate-900 !outline-none placeholder:text-slate-400 !ring-0 focus:!border-0 focus:!outline-none focus:!ring-0';
