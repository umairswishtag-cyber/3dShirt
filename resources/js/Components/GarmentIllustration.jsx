export default function GarmentIllustration({ type = 'shirt', className = '' }) {
    const dress = type === 'dress' || type === 'dresses';
    const footwear = type === 'footwear';
    const headwear = ['caps', 'hats', 'cap', 'hat'].includes(type);
    const label = dress ? 'Dress' : footwear ? 'Footwear' : headwear ? 'Headwear' : 'Shirt';

    return (
        <svg viewBox="0 0 240 180" className={className} role="img" aria-label={`${label} illustration`}>
            <defs>
                <linearGradient id={`fabric-${dress ? 'dress' : 'shirt'}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#dbeafe" />
                    <stop offset="1" stopColor="#bfdbfe" />
                </linearGradient>
                <filter id="garment-shadow" x="-30%" y="-30%" width="160%" height="180%">
                    <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#1e3a8a" floodOpacity=".14" />
                </filter>
            </defs>
            <circle cx="120" cy="85" r="70" fill="#eff6ff" />
            <circle cx="182" cy="38" r="9" fill="#d1fae5" />
            <circle cx="53" cy="127" r="7" fill="#fef3c7" />
            {footwear ? (
                <g filter="url(#garment-shadow)">
                    <path d="M45 91c20 4 39-2 51-28l25 31 66 17c12 3 15 21 3 27-8 4-105 5-132 0-18-4-27-26-13-47Z" fill="url(#fabric-shirt)" stroke="#2563eb" strokeWidth="2" />
                    <path d="M52 124h142M105 82l-17 18M116 93l-16 14" stroke="#60a5fa" strokeWidth="3" />
                </g>
            ) : headwear ? (
                <g filter="url(#garment-shadow)">
                    <path d="M62 108c0-43 24-68 61-68 36 0 59 25 59 68H62Z" fill="url(#fabric-shirt)" stroke="#2563eb" strokeWidth="2" />
                    <path d="M61 108c34-8 71-3 98 14 18 12 37 8 50 0-14-15-32-23-58-23" fill="#bfdbfe" stroke="#2563eb" strokeWidth="2" />
                </g>
            ) : dress ? (
                <g filter="url(#garment-shadow)">
                    <path d="M93 30h54l9 41-18 22 35 63H67l35-63-18-22 9-41Z" fill="url(#fabric-dress)" stroke="#2563eb" strokeWidth="2" />
                    <path d="M94 30c2 18 50 18 52 0" fill="#fff" stroke="#2563eb" strokeWidth="2" />
                    <path d="M93 89h54" stroke="#60a5fa" strokeWidth="3" />
                </g>
            ) : (
                <g filter="url(#garment-shadow)">
                    <path d="m86 38-48 27 18 37 24-12v66h80V90l24 12 18-37-48-27c-5 18-19 24-34 24S91 56 86 38Z" fill="url(#fabric-shirt)" stroke="#2563eb" strokeWidth="2" />
                    <path d="M86 38c6 31 62 31 68 0" fill="#fff" stroke="#2563eb" strokeWidth="2" />
                    <path d="M120 70v77" stroke="#93c5fd" strokeDasharray="4 5" />
                </g>
            )}
        </svg>
    );
}
