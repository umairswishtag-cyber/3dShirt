const TECHNICAL_OR_INTERNAL = /\b(api|source\s*code|codebase|database|sql|server|backend|frontend|php|laravel|react|javascript|token|password|secret|credential|system\s*prompt|internal|implementation|developer|hack|exploit)\b/i;

const includesAny = (text, words) => words.some((word) => text.includes(word));

const joinLabels = (items) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
};

const areaLabels = (product) => Object.entries(product?.model?.printAreas ?? {})
    .map(([id, area]) => area?.label || id.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' '))
    .map((label) => label.charAt(0).toUpperCase() + label.slice(1));

const availableFeatures = (product) => {
    const features = [];
    if (product?.capabilities?.solidColors) features.push('colors');
    if (product?.capabilities?.patterns) features.push('patterns');
    if (product?.capabilities?.logos) features.push('uploaded artwork');
    return features;
};

export const STARTER_QUESTIONS = [
    'What can I customize?',
    'How do I add my logo?',
    'How do I save my design?',
];

/**
 * A deterministic, browser-only response engine. It intentionally knows only
 * customer-facing configurator actions and receives no application internals.
 */
export function answerCustomizationQuestion(rawQuestion, product, { adminPreview = false } = {}) {
    const question = String(rawQuestion ?? '').trim().slice(0, 280);
    const text = question.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ');
    const features = availableFeatures(product);
    const areas = areaLabels(product);

    if (! question) {
        return 'Ask me a question about customizing this product.';
    }

    if (TECHNICAL_OR_INTERNAL.test(text)) {
        return 'I can only help with using the product customizer. I can explain colors, patterns, artwork placement, product views, resetting, and saving a design.';
    }

    if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text)) {
        return `Hi! I can help you customize ${product?.name ?? 'this product'}. Ask me about ${joinLabels(features) || 'the available design options'}.`;
    }

    if (includesAny(text, ['what can i customize', 'what can customize', 'options', 'features', 'help me', 'how to customize', 'start'])) {
        return features.length
            ? `${product?.name ?? 'This product'} supports ${joinLabels(features)}. Choose a tool from the side panel on desktop or the bottom toolbar on mobile.`
            : 'This product currently has no customer-editable options.';
    }

    if (includesAny(text, ['color', 'colour', 'shade', 'palette'])) {
        if (! product?.capabilities?.solidColors) {
            return 'Color changes are not available for this product. You can use the other options shown in the customizer.';
        }
        const zones = (product.colorZoneOptions ?? []).map((zone) => zone.label);
        const zoneText = zones.length ? ` You can edit ${joinLabels(zones)} separately.` : '';
        return `Open Colors, select the product area you want, then choose a swatch.${zoneText}`;
    }

    if (includesAny(text, ['pattern', 'print', 'texture'])) {
        if (! product?.capabilities?.patterns) {
            return 'Patterns are not available for this product. Try the color or artwork options shown in the customizer.';
        }
        const names = (product.patterns ?? []).slice(0, 4).map((pattern) => pattern.name);
        return `Open Images, choose a pattern, and select the areas where it should appear.${names.length ? ` Available choices include ${joinLabels(names)}.` : ''}`;
    }

    if (includesAny(text, ['logo', 'image', 'artwork', 'photo', 'upload'])) {
        if (! product?.capabilities?.logos) {
            return 'Uploaded artwork is not available for this product. Use the color or pattern options that are shown.';
        }
        return 'Open Images and choose Upload logo. After adding the file, use the 2D print editor to move, resize, or rotate it inside the safe print area.';
    }

    if (includesAny(text, ['move', 'resize', 'rotate', 'position', 'placement', 'bigger', 'smaller'])) {
        if (! product?.capabilities?.logos) {
            return 'Artwork placement is not available on this product because logo uploads are turned off.';
        }
        return 'Select the artwork in the 2D print editor. Drag it to move, use the corner handles to resize, and use the rotation control to turn it. Keep it inside the print boundary.';
    }

    if (includesAny(text, ['front', 'back', 'side', 'sleeve', 'area', 'where can'])) {
        return areas.length
            ? `The available customization areas are ${joinLabels(areas)}. Use the area selector near the product view to switch between them.`
            : 'This product does not have separate artwork areas. Use the options currently shown in the customizer.';
    }

    if (includesAny(text, ['undo', 'redo', 'mistake'])) {
        return 'Use Undo to reverse your latest edit and Redo to restore it. You can also reset the whole design from the top bar.';
    }

    if (includesAny(text, ['reset', 'clear', 'remove everything', 'start over'])) {
        return 'Choose Reset in the top bar, then confirm. This returns colors and artwork to the product defaults.';
    }

    if (includesAny(text, ['save', 'finish', 'done', 'finalize'])) {
        return adminPreview
            ? 'Saving is disabled in administrator preview. Open the customer configurator to save or finish a design.'
            : 'Choose Save to keep a draft, or Finish when the design is ready. Your design will be stored in your customer account.';
    }

    if (includesAny(text, ['change product', 'another product', 'different product', 'choose product'])) {
        return 'Choose Change product in the top bar to return to the catalog. Select another item to start customizing it.';
    }

    if (includesAny(text, ['mobile', 'phone', 'tablet'])) {
        return 'On mobile, use the toolbar at the bottom. Tap a tool to open its panel, make your changes, then close the panel to see more of the 3D product.';
    }

    return 'I can help only with customizing this product. Try asking what you can customize, how to change colors, add artwork, position a logo, reset, or save your design.';
}
