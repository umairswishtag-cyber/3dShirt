const paths = {
    products: <><path d="m7.5 4.3 4.5-2.1 4.5 2.1L12 6.5 7.5 4.3Z" /><path d="M4.5 6.2 12 10l7.5-3.8M5 7v9.7l7 3.3 7-3.3V7M12 10v10" /></>,
    published: <><circle cx="12" cy="12" r="9" /><path d="m8.3 12.2 2.4 2.4 5-5.2" /></>,
    draft: <><path d="M6.5 3.5h8l3 3v14h-11v-17Z" /><path d="M14.5 3.5v4h3M9 12h6M9 16h4" /></>,
    patterns: <><circle cx="8" cy="8" r="4" /><circle cx="16" cy="8" r="4" /><circle cx="8" cy="16" r="4" /><circle cx="16" cy="16" r="4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    storefront: <><path d="M4 10v10h16V10M3 10l2-6h14l2 6" /><path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2M9 20v-5h6v5" /></>,
    orders: <><path d="M6 3.5h12v17H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    shirt: <><path d="m8 4-5 3 2 5 2-1v9h10v-9l2 1 2-5-5-3a4 4 0 0 1-8 0Z" /></>,
    dress: <><path d="M9 3h6l1 5-2 3 4 10H6l4-10-2-3 1-5Z" /><path d="M9 3a3 3 0 0 0 6 0" /></>,
    cap: <><path d="M5 14c0-5 2.8-8 7-8s7 3 7 8H5Z" /><path d="M5 14c4-1 8-.5 11 2 2.5 2 5 1 6 0-2-2-4-3-7-3" /></>,
    footwear: <><path d="M4 7v7c0 2 2 3 5 3h10c2 0 3-1 3-2.5 0-1-1-1.8-2.5-2L13 11 9 6 4 7Z" /><path d="M4 14h18" /></>,
    cup: <><path d="M5 5h12v11a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V5Z" /><path d="M17 8h1.5a3 3 0 0 1 0 6H17M4 5h14" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0M16 6.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 4 5" /></>,
    bookmark: <path d="M6 3.5h12v17L12 16l-6 4.5v-17Z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="4.5" y="10" width="15" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    sparkles: <><path d="m12 3 .8 2.2L15 6l-2.2.8L12 9l-.8-2.2L9 6l2.2-.8L12 3ZM18 12l.7 1.8 1.8.7-1.8.7L18 17l-.7-1.8-1.8-.7 1.8-.7L18 12ZM6 13l1 2.5 2.5 1L7 17.5 6 20l-1-2.5-2.5-1 2.5-1L6 13Z" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" /></>,
    trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    chat: <><path d="M20 14a4 4 0 0 1-4 4H9l-5 3 1.4-4.2A7 7 0 0 1 3 11.5C3 7.4 6.8 4 11.5 4S20 7.4 20 11.5V14Z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" /></>,
};

export default function UiIcon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {paths[name] ?? paths.sparkles}
        </svg>
    );
}
