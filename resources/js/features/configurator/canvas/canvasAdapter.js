export function designObjectToKonvaProps(object, canvasSize) {
    return {
        x: object.x * canvasSize,
        y: object.y * canvasSize,
        width: object.width * canvasSize,
        height: object.height * canvasSize,
        offsetX: (object.width * canvasSize) / 2,
        offsetY: (object.height * canvasSize) / 2,
        scaleX: object.scaleX * (object.flipX ? -1 : 1),
        scaleY: object.scaleY * (object.flipY ? -1 : 1),
        rotation: object.rotation,
        opacity: object.opacity,
    };
}

export function konvaNodeToDesignPatch(node, canvasSize) {
    return {
        x: node.x() / canvasSize,
        y: node.y() / canvasSize,
        scaleX: Math.abs(node.scaleX()),
        scaleY: Math.abs(node.scaleY()),
        flipX: node.scaleX() < 0,
        flipY: node.scaleY() < 0,
        rotation: node.rotation(),
    };
}
