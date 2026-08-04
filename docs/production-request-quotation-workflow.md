# Portal-first custom production workflow

The configurator does not create a Shopify cart item. It creates a production request in this portal. Shopify is used later as the secure invoice and payment channel after the customer accepts a quotation.

## Lifecycle

```text
Customer publishes design
        |
        v
submitted -> under_review -> quoted -> quote_approved -> payment_pending -> paid
                  |             |                              |             |
                  v             v                              |             v
          changes_requested  rejected/cancelled                |       proof_review
                                                                  -> ready_for_print
                                                                  -> printing
                                                                  -> completed
```

Request status and payment status are stored separately. Every transition writes a `production_request_events` record containing the actor, old status, new status, note, metadata, and timestamp.

## Customer flow

1. Save an unfinished design as **Draft**, or choose **Publish** when it is ready.
2. **Request quotation** automatically publishes the current design, then freezes the design JSON, final GLB, 2048px print areas, source logos, SVG pattern, selected variant, and quantity.
3. Open **Requests & quotations** in the customer dashboard.
4. Review and approve the versioned quotation, ask for changes, or decline.
5. Follow the Shopify invoice link after the admin sends it.
6. Track proof, print approval, production, and completion. The page reloads request data every 15 seconds.

Tracking remains in the secure app portal. **Create new design**, saved-design editing, and **Back to Shopify store** return through the Shopify storefront at `/pages/configurator`; saved designs keep their `?design=` identifier.

## Admin flow

1. Open **Requests** (not **Orders**) in the admin navigation.
2. Rotate and inspect the submitted final GLB directly on the request page, or download the private production manifest/assets.
3. Request changes, reject the request, or enter a quotation with unit price, quantity, shipping, tax, discount, currency, expiry, and scope notes.
4. Wait for customer approval.
5. Create and email a Shopify Draft Order invoice, or record a manually cleared payment reference.
6. Send a proof if required, approve for print, start printing, and complete production.

The invoice is a Shopify custom line item whose amount equals the approved portal quote total. This avoids Shopify catalog pricing changing the negotiated custom-development amount.

## Realtime and Shopify synchronization

- Portal events are the source of truth and customer request pages poll every 15 seconds for dependable near-realtime updates.
- Shopify `orders/create` and `orders/updated` webhooks correlate `_3d_job_id`. A paid Shopify order moves the request to `paid` and records `shopify_payment_cleared` without downgrading requests already in production.
- The existing five-minute order sync remains a repair/reconciliation path, not the primary workflow.
- WebSockets can replace polling later without changing the state machine or event log.

## Shopify setup

The app requires `read_draft_orders` and `write_draft_orders` to create and email invoices. Deploy the updated app configuration and reauthorize the store after adding scopes.

General Shopify Order import still requires Shopify approval for protected customer data. That approval is no longer required for receiving, reviewing, or manually progressing portal production requests, but is required for automatic Order/payment reconciliation.

Official API references:

- https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftordercreate
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderInvoiceSend
- https://shopify.dev/docs/api/admin-graphql/latest/objects/draftorder

## Deployment checklist

1. Run `php artisan migrate --force`.
2. Run `php artisan lighthouse:clear-cache` after every GraphQL schema change.
3. Deploy the frontend bundles and the updated theme extension loader.
4. Deploy Shopify app configuration/scopes and reauthorize the store.
5. Confirm `orders/create` and `orders/updated` webhook subscriptions after protected Order access is approved.
6. Keep the Laravel queue worker and scheduler running.
7. Submit a test design, quote it, approve it as the customer, send the invoice, pay it, and confirm the request becomes `paid`.
