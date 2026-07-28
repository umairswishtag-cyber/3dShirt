import { createRoot } from 'react-dom/client';
import ConfiguratorPage from '@/Pages/Configurator/ConfiguratorPage';
import { setGraphqlEndpoint } from '@/services/graphqlClient';
import '../css/configurator-embed.css';

const mountedHosts = new WeakSet();

function proxyUrl(path, config) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('customer_name', config.customerName || '');
    url.searchParams.set('customer_email', config.customerEmail || '');

    return `${url.pathname}${url.search}`;
}

function renderMessage(root, message, loginUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'shirt-configurator-error';
    const panel = document.createElement('div');
    const text = document.createElement('p');
    text.textContent = message;
    panel.appendChild(text);

    if (loginUrl) {
        const link = document.createElement('a');
        link.href = loginUrl;
        link.textContent = 'Sign in with Shopify';
        link.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.assign(loginUrl);
        });
        panel.appendChild(link);
    }

    wrapper.appendChild(panel);
    root.replaceChildren(wrapper);
}

async function mountConfigurator(host, config) {
    if (mountedHosts.has(host)) return;
    mountedHosts.add(host);

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = config.stylesheetUrl;
    const appRoot = document.createElement('div');
    appRoot.className = 'shirt-configurator-loading';
    appRoot.textContent = 'Loading your 3D configurator…';
    shadow.append(stylesheet, appRoot);

    const bootstrapUrl = proxyUrl('/apps/configurator/bootstrap', config);
    const graphqlUrl = proxyUrl('/apps/configurator/graphql', config);

    try {
        const response = await fetch(bootstrapUrl, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            renderMessage(
                appRoot,
                payload?.message || 'The configurator could not be opened.',
                payload?.loginUrl || config.loginUrl,
            );
            return;
        }

        setGraphqlEndpoint(graphqlUrl);
        appRoot.className = '';
        createRoot(appRoot).render(
            <ConfiguratorPage
                catalog={payload.catalog}
                storefront={{
                    ...payload.storefront,
                    configuratorUrl: window.location.pathname,
                }}
                embedded
            />,
        );
    } catch {
        renderMessage(
            appRoot,
            'The configurator is temporarily unavailable. Refresh the page and try again.',
        );
    }
}

function configFrom(element) {
    return {
        customerName: element.dataset.customerName || '',
        customerEmail: element.dataset.customerEmail || '',
        loginUrl: element.dataset.loginUrl || '/account/login',
        stylesheetUrl: element.dataset.stylesheetUrl,
    };
}

function discover() {
    document.querySelectorAll('[data-shirt-configurator-root]').forEach((host) => {
        mountConfigurator(host, configFrom(host));
    });

    document.querySelectorAll('[data-shirt-configurator-embed]').forEach((embed) => {
        if (embed.dataset.initialized === 'true') return;
        embed.dataset.initialized = 'true';
        const target = document.getElementById(embed.dataset.targetId);
        if (!target) return;

        const host = document.createElement('div');
        host.className = 'shirt-configurator';
        host.dataset.shirtConfiguratorRoot = '';
        target.appendChild(host);
        mountConfigurator(host, configFrom(embed));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', discover, { once: true });
} else {
    discover();
}

document.addEventListener('shopify:section:load', discover);
