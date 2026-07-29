import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Image as KonvaImage,
    Layer,
    Rect,
    Stage,
    Transformer,
} from 'react-konva';
import { shallow } from 'zustand/shallow';
import { getLogoDesignArea, shouldFlipEditorY } from '../config/designAreas';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';
import {
    designObjectToKonvaProps,
    konvaNodeToDesignPatch,
} from './canvasAdapter';

function useCanvasImage(source) {
    const [image, setImage] = useState(null);

    useEffect(() => {
        let active = true;
        const nextImage = new Image();
        nextImage.decoding = 'async';
        nextImage.onload = () => active && setImage(nextImage);
        nextImage.onerror = () => active && setImage(null);
        nextImage.src = source;

        return () => {
            active = false;
        };
    }, [source]);

    return image;
}

function DesignImage({
    object,
    canvasSize,
    isSelected,
    flipEditorY,
    printBounds,
}) {
    const image = useCanvasImage(object.source);
    const imageRef = useRef(null);
    const transformerRef = useRef(null);
    const selectDesignObject = useConfiguratorStore((state) => state.selectDesignObject);
    const updateDesignObject = useConfiguratorStore((state) => state.updateDesignObject);
    const beginObjectTransform = useConfiguratorStore((state) => state.beginObjectTransform);
    const commitObjectTransform = useConfiguratorStore((state) => state.commitObjectTransform);
    const props = useMemo(
        () => designObjectToKonvaProps(object, canvasSize, flipEditorY),
        [canvasSize, flipEditorY, object],
    );

    useEffect(() => {
        if (!isSelected || !imageRef.current || !transformerRef.current) return;
        transformerRef.current.nodes([imageRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
    }, [isSelected]);

    const previewTransform = (event) => {
        updateDesignObject(
            object.id,
            konvaNodeToDesignPatch(event.target, canvasSize, flipEditorY),
            false,
        );
    };
    const constrainTransformerBox = (oldBox, newBox) => {
        const minimumSize = Math.max(20, canvasSize * 0.06);
        const right = newBox.x + newBox.width;
        const bottom = newBox.y + newBox.height;
        const printRight = printBounds.x + printBounds.width;
        const printBottom = printBounds.y + printBounds.height;

        if (
            !Number.isFinite(newBox.x) ||
            !Number.isFinite(newBox.y) ||
            !Number.isFinite(newBox.width) ||
            !Number.isFinite(newBox.height) ||
            newBox.width < minimumSize ||
            newBox.height < minimumSize ||
            newBox.x < printBounds.x ||
            newBox.y < printBounds.y ||
            right > printRight ||
            bottom > printBottom
        ) {
            return oldBox;
        }

        return newBox;
    };

    return (
        <>
            <KonvaImage
                ref={imageRef}
                image={image}
                {...props}
                draggable
                onClick={() => selectDesignObject(object.id)}
                onTap={() => selectDesignObject(object.id)}
                onDragStart={beginObjectTransform}
                onDragMove={previewTransform}
                onDragEnd={(event) => {
                    previewTransform(event);
                    commitObjectTransform();
                }}
                onTransformStart={beginObjectTransform}
                onTransform={previewTransform}
                onTransformEnd={(event) => {
                    previewTransform(event);
                    commitObjectTransform();
                }}
            />

            {isSelected && (
                <Transformer
                    ref={transformerRef}
                    rotateEnabled
                    flipEnabled={false}
                    keepRatio
                    enabledAnchors={[
                        'top-left',
                        'top-right',
                        'bottom-left',
                        'bottom-right',
                    ]}
                    anchorFill="#ffffff"
                    anchorStroke="#2563eb"
                    borderStroke="#2563eb"
                    anchorSize={12}
                    padding={4}
                    boundBoxFunc={constrainTransformerBox}
                />
            )}
        </>
    );
}

export default function DesignCanvas({ compact = false }) {
    const containerRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState(compact ? 230 : 300);
    const activeDesignAreaId = useConfiguratorStore((state) => state.activeDesignAreaId);
    const selectedObjectId = useConfiguratorStore((state) => state.selectedObjectId);
    const product = useConfiguratorStore((state) => state.product);
    const selectDesignObject = useConfiguratorStore((state) => state.selectDesignObject);
    const objects = useConfiguratorStore(
        (state) =>
            state.designObjects
                .filter((object) => object.areaId === state.activeDesignAreaId)
                .sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0)),
        shallow,
    );
    const area = getLogoDesignArea(product, activeDesignAreaId);
    const flipEditorY = shouldFlipEditorY(product, activeDesignAreaId);

    useEffect(() => {
        if (!containerRef.current) return undefined;

        const updateSize = () => {
            const width = containerRef.current?.clientWidth ?? 0;
            if (width > 0) setCanvasSize(Math.min(width, compact ? 260 : 420));
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [compact]);

    const bounds = {
        x: area.bounds.x * canvasSize,
        y: area.bounds.y * canvasSize,
        width: area.bounds.width * canvasSize,
        height: area.bounds.height * canvasSize,
    };

    return (
        <div ref={containerRef} className="w-full">
            <div
                className="mx-auto overflow-hidden rounded-xl border border-slate-200 shadow-inner"
                style={{
                    width: canvasSize,
                    height: canvasSize,
                    backgroundColor: '#f8fafc',
                    backgroundImage:
                        'linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',
                    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0px',
                    backgroundSize: '16px 16px',
                }}
            >
                <Stage
                    width={canvasSize}
                    height={canvasSize}
                    onMouseDown={(event) => {
                        if (event.target === event.target.getStage()) selectDesignObject(null);
                    }}
                    onTouchStart={(event) => {
                        if (event.target === event.target.getStage()) selectDesignObject(null);
                    }}
                >
                    <Layer listening={false}>
                        <Rect
                            {...bounds}
                            fill="rgba(255,255,255,0.76)"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dash={[8, 6]}
                            cornerRadius={8}
                        />
                    </Layer>
                    <Layer>
                        {objects.map((object) => (
                            <DesignImage
                                key={object.id}
                                object={object}
                                canvasSize={canvasSize}
                                isSelected={object.id === selectedObjectId}
                                flipEditorY={flipEditorY}
                                printBounds={bounds}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
            <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                {area.label} print area · drag, resize or rotate
            </p>
        </div>
    );
}
