import { useEffect, useMemo, useRef, useState } from 'react';
import { answerCustomizationQuestion, STARTER_QUESTIONS } from './localChatbotEngine';

const placements = {
    'top-left': {
        root: 'left-3 top-[76px] sm:left-5',
        panel: 'left-0 top-[68px]',
    },
    'top-right': {
        root: 'right-3 top-[76px] sm:right-5',
        panel: 'right-0 top-[68px]',
    },
    'bottom-left': {
        root: 'bottom-[82px] left-3 sm:bottom-5 sm:left-5',
        panel: 'bottom-[68px] left-0',
    },
    'bottom-right': {
        root: 'bottom-[82px] right-3 sm:bottom-5 sm:right-5',
        panel: 'bottom-[68px] right-0',
    },
};

function ChatIcon({ close = false }) {
    return close ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    ) : (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 14a4 4 0 0 1-4 4H9l-5 3 1.4-4.2A7 7 0 0 1 3 11.5C3 7.4 6.8 4 11.5 4S20 7.4 20 11.5V14Z" />
            <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" />
        </svg>
    );
}

export default function CustomizationChatbot({ config, product, adminPreview = false }) {
    const position = placements[config?.position] ? config.position : 'bottom-right';
    const placement = placements[position];
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const inputRef = useRef(null);
    const messageEndRef = useRef(null);
    const productKey = product?.id;

    const greeting = useMemo(
        () => `Hi! I’m your customization guide. I can help you personalize ${product?.name ?? 'this product'}.`,
        [product?.name],
    );

    useEffect(() => {
        setMessages([{ id: `welcome-${productKey}`, role: 'assistant', text: greeting }]);
        setInput('');
    }, [greeting, productKey]);

    useEffect(() => {
        if (open) window.setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    if (! config?.enabled) return null;

    const submit = (question = input) => {
        const value = question.trim();
        if (! value) return;

        setMessages((current) => [
            ...current,
            { id: `user-${Date.now()}`, role: 'user', text: value },
            {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                text: answerCustomizationQuestion(value, product, { adminPreview }),
            },
        ]);
        setInput('');
    };

    return (
        <aside className={`fixed z-[75] ${placement.root}`} aria-label="Product customization assistant">
            {open && (
                <section className={`absolute flex h-[min(34rem,calc(100dvh-170px))] w-[min(23rem,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] ${placement.panel}`}>
                    <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 px-5 py-4 text-white">
                        <span className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/10" />
                        <div className="relative flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><ChatIcon /></span>
                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-bold">Customization guide</h2>
                                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-indigo-100">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                                    Local help · No external service
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-4" role="log" aria-live="polite">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 shadow-sm ${message.role === 'user' ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'}`}>
                                    {message.text}
                                </p>
                            </div>
                        ))}

                        {messages.length === 1 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {STARTER_QUESTIONS.map((question) => (
                                    <button key={question} type="button" onClick={() => submit(question)} className="rounded-full border border-indigo-200 bg-white px-3 py-2 text-left text-[11px] font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50">
                                        {question}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div ref={messageEndRef} />
                    </div>

                    <form
                        className="border-t border-slate-200 bg-white p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit();
                        }}
                    >
                        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                            <label htmlFor="customization-chat-question" className="sr-only">Ask about product customization</label>
                            <textarea
                                ref={inputRef}
                                id="customization-chat-question"
                                rows="1"
                                maxLength="280"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && ! event.shiftKey) {
                                        event.preventDefault();
                                        submit();
                                    }
                                }}
                                placeholder="Ask about customizing…"
                                className="max-h-24 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-0 focus:ring-0"
                            />
                            <button type="submit" disabled={! input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300" aria-label="Send question">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 4 17 8-17 8 3-8-3-8Z" /><path d="M7 12h14" /></svg>
                            </button>
                        </div>
                        <p className="mt-2 text-center text-[10px] text-slate-400">Customization guidance only · Messages are not stored</p>
                    </form>
                </section>
            )}

            <button
                type="button"
                onClick={() => setOpen((current) => ! current)}
                className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_14px_34px_rgba(79,70,229,0.38)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(79,70,229,0.46)] focus:outline-none focus:ring-4 focus:ring-indigo-200"
                aria-expanded={open}
                aria-label={open ? 'Close customization assistant' : 'Open customization assistant'}
            >
                <ChatIcon close={open} />
                {! open && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />}
            </button>
        </aside>
    );
}
