export const SHIRT_MODEL = {
    url: '/models/t-shirt/t-shirt.glb',
    scale: 3.5,
    center: [0, 1.287, 0],
    meshZones: {
        Object_6: 'collar',
        Object_8: 'collar',
        Object_10: 'body',
        Object_11: 'body',
        Object_12: 'body',
        Object_14: 'body',
        Object_15: 'body',
        Object_16: 'body',
        Object_18: 'rightSleeve',
        Object_20: 'leftSleeve',
    },
    printAreas: {
        front: {
            meshName: 'Object_10',
            outwardNormalZ: 1,
            uvBounds: {
                min: [-236.45164489746094, -406.00201416015625],
                max: [236.44277954101562, 297.2185974121094],
            },
        },
        back: {
            meshName: 'Object_14',
            outwardNormalZ: -1,
            uvBounds: {
                min: [-250.21524047851562, -369.1955261230469],
                max: [249.80685424804688, 343.9002380371094],
            },
        },
        leftSleeve: {
            meshName: 'Object_20',
            outwardNormalZ: null,
            uvBounds: {
                min: [-198.5648193359375, -101.9967041015625],
                max: [198.56475830078125, 102.029052734375],
            },
        },
        rightSleeve: {
            meshName: 'Object_18',
            outwardNormalZ: null,
            uvBounds: {
                min: [-198.56475830078125, -101.9967041015625],
                max: [198.5648193359375, 102.029052734375],
            },
        },
    },
};
