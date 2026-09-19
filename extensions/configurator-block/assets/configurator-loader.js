(() => {
  if (window.__shirtConfiguratorBundleLoading) return;
  window.__shirtConfiguratorBundleLoading = true;

  const cacheToken = Date.now().toString();
  document.querySelectorAll('[data-stylesheet-url]').forEach((element) => {
    const stylesheetUrl = new URL(element.dataset.stylesheetUrl);
    stylesheetUrl.searchParams.set('v', cacheToken);
    element.dataset.stylesheetUrl = stylesheetUrl.toString();
  });

  const script = document.createElement('script');
  script.src = `https://app.a2zhnt.online/build/shopify/configurator-embed.js?v=${cacheToken}`;
  script.defer = true;
  script.dataset.shirtConfiguratorBundle = '';
  script.addEventListener('error', () => {
    window.__shirtConfiguratorBundleLoading = false;
    document.querySelectorAll('[data-shirt-configurator-root]').forEach((root) => {
      root.textContent = 'The 3D configurator could not be loaded. Refresh the page and try again.';
    });
  });
  document.head.appendChild(script);
})();
