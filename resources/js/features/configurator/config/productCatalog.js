import { SHIRT_MODEL } from './shirtModel';
import { SHIRT_PATTERNS } from './patterns';

export const GENDER_OPTIONS = [
    { id: 'men', label: 'Men' },
    { id: 'women', label: 'Women' },
    { id: 'unisex', label: 'Unisex' },
    { id: 'kids', label: 'Kids' },
];

export const GARMENT_CATEGORIES = [
    { id: 'shirts', label: 'Shirts' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'pants', label: 'Pants' },
];

export const PRODUCT_CATALOG = [
    {
        id: 'basic-tshirt',
        name: 'Men Basic T-Shirt',
        description: 'Full pattern, logo, and four-zone color customization.',
        gender: 'men',
        category: 'shirts',
        model: { ...SHIRT_MODEL, fitHeight: 2.45 },
        colorZones: ['body', 'leftSleeve', 'rightSleeve', 'collar'],
        colorZoneOptions: [
            { id: 'body', label: 'Body', defaultColor: '#F8FAFC' },
            { id: 'leftSleeve', label: 'Left sleeve', defaultColor: '#F8FAFC' },
            { id: 'rightSleeve', label: 'Right sleeve', defaultColor: '#F8FAFC' },
            { id: 'collar', label: 'Collar', defaultColor: '#0F172A' },
        ],
        defaultColors: { body: '#F8FAFC', leftSleeve: '#F8FAFC', rightSleeve: '#F8FAFC', collar: '#0F172A' },
        allowedColors: [],
        patternZones: ['front', 'back', 'leftSleeve', 'rightSleeve'],
        patterns: SHIRT_PATTERNS,
        capabilities: { solidColors: true, patterns: true, logos: true },
    },
    {
        id: 'men-shirt-2',
        name: 'Men T-Shirt Model 2',
        description: 'Single-zone solid-color garment. Product UV adapter pending.',
        gender: 'men',
        category: 'shirts',
        model: {
            url: '/models/men/man-2.glb',
            fitHeight: 2.45,
            meshZones: {
                't_shirt_Model3_t_shirt_Model30.002_0': 'body',
                't_shirt_Model3_t_shirt_Model31.002_0': 'body',
            },
            printAreas: {},
        },
        colorZones: ['body'],
        colorZoneOptions: [{ id: 'body', label: 'Body', defaultColor: '#F8FAFC' }],
        defaultColors: { body: '#F8FAFC' },
        allowedColors: [],
        patternZones: [],
        patterns: [],
        capabilities: { solidColors: true, patterns: false, logos: false },
    },
    {
        id: 'women-tshirt-dress',
        name: 'Women T-Shirt Dress',
        description: 'Single-zone solid-color dress. This source GLB has no UV map.',
        gender: 'women',
        category: 'dresses',
        model: {
            url: '/models/women/women.glb',
            fitHeight: 2.45,
            meshZones: { Object_2: 'body' },
            printAreas: {},
        },
        colorZones: ['body'],
        colorZoneOptions: [{ id: 'body', label: 'Body', defaultColor: '#F8FAFC' }],
        defaultColors: { body: '#F8FAFC' },
        allowedColors: [],
        patternZones: [],
        patterns: [],
        capabilities: { solidColors: true, patterns: false, logos: false },
    },
];

export const PRODUCTS_BY_ID = Object.fromEntries(
    PRODUCT_CATALOG.map((product) => [product.id, product]),
);

export const DEFAULT_PRODUCT_ID = 'basic-tshirt';

export function replaceProductCatalog(products) {
    if (!Array.isArray(products)) return PRODUCT_CATALOG;

    PRODUCT_CATALOG.splice(0, PRODUCT_CATALOG.length, ...products);
    Object.keys(PRODUCTS_BY_ID).forEach((id) => delete PRODUCTS_BY_ID[id]);
    products.forEach((product) => {
        PRODUCTS_BY_ID[product.id] = product;
    });

    return PRODUCT_CATALOG;
}
