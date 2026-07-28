export class GraphQLRequestError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'GraphQLRequestError';
        this.errors = errors;
        this.fieldErrors = Object.assign(
            {},
            ...errors.map((error) => error.extensions?.validation ?? {}),
        );
    }
}

let graphqlEndpoint = '/graphql';

export function setGraphqlEndpoint(endpoint) {
    graphqlEndpoint = endpoint || '/graphql';
}

export async function graphqlRequest(query, variables = {}) {
    const csrfToken = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');
    const response = await fetch(graphqlEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || result?.errors?.length) {
        const validationMessage = result?.errors
            ?.flatMap((error) => Object.values(error.extensions?.validation ?? {}))
            .flat()
            .find(Boolean);
        const message = response.status === 419
            ? 'Your session expired. Refresh the page and try again.'
            : response.status === 413
              ? 'This design is too large to save. Remove one or more large images and try again.'
              : response.status === 401 || response.status === 403
                ? 'Please sign in again before saving your design.'
                : validationMessage || result?.errors?.[0]?.message || 'Something went wrong. Please try again.';
        throw new GraphQLRequestError(message, result?.errors ?? []);
    }

    return result.data;
}
