(() => {
  if (window.__shirtConfiguratorBundleLoading) return;
  window.__shirtConfiguratorBundleLoading = true;

  const script = document.createElement('script');
  script.src = 'https://umair.xoarhigh.info/build/shopify/configurator-embed.js?v=21';
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
