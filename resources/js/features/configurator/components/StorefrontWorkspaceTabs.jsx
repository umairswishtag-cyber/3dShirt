import UiIcon from "@/Components/UiIcon";

const tabs = [
    { id: "configurator", label: "Configurator", shortLabel: "Create", icon: "shirt" },
    { id: "saved", label: "Saved Designs", shortLabel: "Saved", icon: "bookmark" },
    { id: "final", label: "Final Products", shortLabel: "Final", icon: "check" },
];

export default function StorefrontWorkspaceTabs({
    activeTab,
    onTabChange,
    accountUrl,
}) {
    return (
        <div className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-2 sm:px-4">
            <nav
                className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto"
                aria-label="Design workspace"
            >
                {tabs.map((tab) => {
                    const active = tab.id === activeTab;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            aria-current={active ? "page" : undefined}
                            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:px-4 ${
                                active
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                        >
                            <UiIcon name={tab.icon} className="h-4 w-4" />
                            <span className="sm:hidden">{tab.shortLabel}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {accountUrl && (
                <a
                    href={accountUrl}
                    className="ml-2 hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 md:inline-flex"
                >
                    <UiIcon name="user" className="h-4 w-4" />
                    Shopify account
                </a>
            )}
        </div>
    );
}
