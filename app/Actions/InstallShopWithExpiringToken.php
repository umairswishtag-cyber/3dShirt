<?php

namespace App\Actions;

use App\Models\User;
use App\Services\Shopify\ShopifyTokenManager;
use Osiset\ShopifyApp\Actions\InstallShop;
use Osiset\ShopifyApp\Objects\Enums\AuthMode;
use Osiset\ShopifyApp\Objects\Enums\ThemeSupportLevel as ThemeSupportLevelEnum;
use Osiset\ShopifyApp\Objects\Values\NullAccessToken;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use Osiset\ShopifyApp\Objects\Values\ThemeSupportLevel;
use Osiset\ShopifyApp\Util;
use RuntimeException;
use Throwable;

class InstallShopWithExpiringToken extends InstallShop
{
    public function __construct($shopQuery, $shopCommand, $verifyThemeSupport, private readonly ShopifyTokenManager $tokens)
    {
        parent::__construct($shopQuery, $shopCommand, $verifyThemeSupport);
    }

    public function __invoke(ShopDomain $shopDomain, ?string $code): array
    {
        $shop = $this->shopQuery->getByDomain($shopDomain, [], true);
        if ($shop === null) {
            $this->shopCommand->make($shopDomain, NullAccessToken::fromNative(null));
            $shop = $this->shopQuery->getByDomain($shopDomain);
        }

        $grantMode = $shop->hasOfflineAccess()
            ? AuthMode::fromNative(Util::getShopifyConfig('api_grant_mode', $shop))
            : AuthMode::OFFLINE();

        if (empty($code)) {
            return [
                'completed' => false,
                'url' => $shop->apiHelper()->buildAuthUrl($grantMode, Util::getShopifyConfig('api_scopes', $shop)),
                'shop_id' => $shop->getId(),
            ];
        }

        try {
            if ($shop->trashed()) {
                $shop->restore();
            }
            if (! $shop instanceof User) {
                throw new RuntimeException('The configured Shopify shop model is not supported.');
            }

            $this->tokens->exchangeAuthorizationCode($shop, $code);

            try {
                $level = ($this->verifyThemeSupport)($shop->getId());
                $this->shopCommand->setThemeSupportLevel($shop->getId(), ThemeSupportLevel::fromNative($level));
            } catch (Throwable) {
                $level = ThemeSupportLevelEnum::NONE;
            }

            return ['completed' => true, 'url' => null, 'shop_id' => $shop->getId(), 'theme_support_level' => $level];
        } catch (Throwable $exception) {
            report($exception);

            return ['completed' => false, 'url' => null, 'shop_id' => null, 'theme_support_level' => null];
        }
    }
}
