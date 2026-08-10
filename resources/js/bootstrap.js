import axios from 'axios';
import { csrfToken, refreshCsrfToken } from './services/csrf';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

const pageToken = csrfToken();
if (pageToken) window.axios.defaults.headers.common['X-CSRF-TOKEN'] = pageToken;

window.axios.interceptors.response.use(undefined, async (error) => {
    const request = error.config;
    if (error.response?.status !== 419 || !request || request._csrfRetried) {
        return Promise.reject(error);
    }

    const token = await refreshCsrfToken();
    if (!token) return Promise.reject(error);

    request._csrfRetried = true;
    request.headers = request.headers ?? {};
    request.headers['X-CSRF-TOKEN'] = token;

    return window.axios(request);
});
