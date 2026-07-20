import { graphqlRequest } from './graphqlClient';

const STORE_DESIGN_ASSET = `
    mutation StoreDesignAsset($input: StoreCustomerDesignAssetInput!) {
        storeMyDesignAsset(input: $input) { url }
    }
`;

export const isInlineDesignAsset = (source) => typeof source === 'string'
    && /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,/i.test(source);

export async function storeDesignAsset(source, name = 'logo') {
    if (!isInlineDesignAsset(source)) return source;

    const data = await graphqlRequest(STORE_DESIGN_ASSET, {
        input: { name, dataUrl: source },
    });

    return data.storeMyDesignAsset.url;
}
