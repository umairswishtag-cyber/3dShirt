<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex">
        <title>Opening customer portal</title>
    </head>
    <body>
        <p>Opening your customer portal&hellip;</p>
        <script>
            window.location.replace(@json($launchUrl));
        </script>
        <noscript>
            <a href="{{ $launchUrl }}">Continue to the customer portal</a>
        </noscript>
    </body>
</html>
