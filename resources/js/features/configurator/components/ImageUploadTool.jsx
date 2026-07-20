import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { DESIGN_AREAS_BY_ID } from '../config/designAreas';
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
    const designObjects = useConfiguratorStore((state) => state.designObjects);
    const addDesignObject = useConfiguratorStore((state) => state.addDesignObject);
    const area = DESIGN_AREAS_BY_ID[activeDesignAreaId];

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
                <span className="mt-1 text-xs text-slate-500">SVG, PNG, JPEG or WebP · max 2 MB</span>
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
