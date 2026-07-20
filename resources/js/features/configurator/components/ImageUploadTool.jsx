import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { getDesignArea, getLogoAreaIds, getLogoDesignArea, supportsLogoPlacement } from '../config/designAreas';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';
import { storeDesignAsset } from '@/services/designAssetService';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function normalizeImageFile(file) {
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) return file;

    return file.name.toLowerCase().endsWith('.svg')
        ? new File([file], file.name, { type: 'image/svg+xml' })
        : null;
}

function readImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('The selected file is not a valid image.'));
            image.onload = () => resolve({ source: reader.result, image });
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

export default function ImageUploadTool() {
    const customer = usePage().props.customer;
    const inputRef = useRef(null);
    const [error, setError] = useState(null);
    const [isReading, setIsReading] = useState(false);
    const activeDesignAreaId = useConfiguratorStore((state) => state.activeDesignAreaId);
    const product = useConfiguratorStore((state) => state.product);
    const designObjects = useConfiguratorStore((state) => state.designObjects);
    const addDesignObject = useConfiguratorStore((state) => state.addDesignObject);
    const setActiveDesignArea = useConfiguratorStore((state) => state.setActiveDesignArea);
    const area = getLogoDesignArea(product, activeDesignAreaId);
    const binding = product.model.printAreas?.[activeDesignAreaId];
    const logoAreas = getLogoAreaIds(product)
        .map((areaId) => getDesignArea(product, areaId))
        .filter(Boolean);

    if (!supportsLogoPlacement(binding)) {
        return (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Logo placement is not configured for this model area yet. Ask the administrator to draw a logo-safe zone on the product GLB.
            </p>
        );
    }

    const handleFile = async (file) => {
        setError(null);
        if (!file) return;

        const imageFile = normalizeImageFile(file);
        if (!imageFile) {
            setError('Choose an SVG, PNG, JPEG, JPG, or WebP image.');
            return;
        }

        if (file.size > MAX_IMAGE_BYTES) {
            setError('Images must be 2 MB or smaller so the local draft remains reliable.');
            return;
        }

        setIsReading(true);
        try {
            const { source: inlineSource, image } = await readImage(imageFile);
            const source = customer ? await storeDesignAsset(inlineSource, imageFile.name) : inlineSource;
            const aspectRatio = image.naturalWidth / image.naturalHeight || 1;
            const width = Math.min(0.3, area.bounds.width * 0.48);
            const height = Math.min(width / aspectRatio, area.bounds.height * 0.48);
            const zIndex = Math.max(
                0,
                ...designObjects
                    .filter((object) => object.areaId === activeDesignAreaId)
                    .map((object) => object.zIndex ?? 0),
            );

            addDesignObject({
                type: 'image',
                areaId: activeDesignAreaId,
                name: file.name,
                source,
                x: area.bounds.x + area.bounds.width / 2,
                y: area.bounds.y + area.bounds.height / 2,
                width,
                height,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                opacity: 1,
                flipX: false,
                flipY: false,
                zIndex: zIndex + 1,
            });
        } catch (uploadError) {
            setError(uploadError.message);
        } finally {
            setIsReading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            {logoAreas.length > 1 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="text-xs font-black text-slate-900">Choose logo placement</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">Each placement can contain one or more uploaded logos.</p>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {logoAreas.map((logoArea) => (
                            <button
                                key={logoArea.id}
                                type="button"
                                onClick={() => setActiveDesignArea(logoArea.id)}
                                className={`rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition ${activeDesignAreaId === logoArea.id ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-blue-100 bg-white text-slate-700 hover:border-blue-300'}`}
                            >
                                {logoArea.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <button
                type="button"
                disabled={isReading}
                onClick={() => inputRef.current?.click()}
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-2xl text-white shadow-sm">
                    +
                </span>
                <span className="text-sm font-semibold text-slate-800">
                    {isReading ? 'Preparing image…' : `Add ${area.label} logo`}
                </span>
                <span className="mt-1 text-xs text-slate-500">SVG, PNG, JPEG or WebP · max 2 MB · multiple logos allowed</span>
            </button>
            <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.jpg,.jpeg"
                onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error}
                </p>
            )}
            <p className="text-xs leading-5 text-slate-500">
                Your logo is applied above the selected product pattern. Drag, resize, and rotate it inside the dashed safe area.
            </p>
        </div>
    );
}
