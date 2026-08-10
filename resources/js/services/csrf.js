let refreshPromise = null;

export function csrfToken() {
    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content') || '';
}

export async function refreshCsrfToken() {
    if (!refreshPromise) {
        refreshPromise = fetch('/csrf-token', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            cache: 'no-store',
        })
            .then(async (response) => {
                if (!response.ok) return '';

                const token = (await response.json())?.token || '';
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (token && meta) meta.setAttribute('content', token);

                return token;
            })
            .catch(() => '')
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

export async function fetchWithCsrf(resource, options = {}) {
    const request = async (token) => {
        const headers = new Headers(options.headers ?? {});
        if (token) headers.set('X-CSRF-TOKEN', token);

        return fetch(resource, {
            ...options,
            credentials: options.credentials ?? 'same-origin',
            headers,
        });
    };

    let response = await request(csrfToken());
    if (response.status !== 419) return response;

    const refreshedToken = await refreshCsrfToken();
    if (!refreshedToken) return response;

    response = await request(refreshedToken);

    return response;
}
