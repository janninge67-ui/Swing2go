// Swing2Go Golf UF — huvudingång för Workern.
//
// All /api/*-trafik routas härifrån till rätt handler i src/handlers/.
// Allt annat (index.html, css, js, bilder, /admin, osv.) faller igenom till
// de statiska filerna i public/, via ASSETS-bindningen som wrangler.jsonc
// sätter upp automatiskt.

import { createCheckoutSession } from './handlers/create-checkout-session.js';
import { stripeWebhook } from './handlers/stripe-webhook.js';
import { swishOrderCreate, swishOrderConfirm } from './handlers/swish-order.js';
import { adminLogin } from './handlers/admin-login.js';
import {
  adminProductsGet,
  adminProductsPost,
  adminProductsPut,
  adminProductsDelete,
} from './handlers/admin-products.js';
import { adminOrdersGet, adminOrdersPut } from './handlers/admin-orders.js';
import { adminUploadImage } from './handlers/admin-upload-image.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    try {
      if (pathname === '/api/create-checkout-session' && method === 'POST') {
        return await createCheckoutSession(request, env);
      }
      if (pathname === '/api/stripe-webhook' && method === 'POST') {
        return await stripeWebhook(request, env);
      }
      if (pathname === '/api/swish-order' && method === 'POST') {
        return await swishOrderCreate(request, env);
      }
      if (pathname === '/api/swish-order' && method === 'PATCH') {
        return await swishOrderConfirm(request, env);
      }
      if (pathname === '/api/admin/login' && method === 'POST') {
        return await adminLogin(request, env);
      }
      if (pathname === '/api/admin/products') {
        if (method === 'GET') return await adminProductsGet(request, env);
        if (method === 'POST') return await adminProductsPost(request, env);
        if (method === 'PUT') return await adminProductsPut(request, env);
        if (method === 'DELETE') return await adminProductsDelete(request, env);
      }
      if (pathname === '/api/admin/orders') {
        if (method === 'GET') return await adminOrdersGet(request, env);
        if (method === 'PUT') return await adminOrdersPut(request, env);
      }
      if (pathname === '/api/admin/upload-image' && method === 'POST') {
        return await adminUploadImage(request, env);
      }
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: 'Internt serverfel.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ingen /api-rutt matchade — servera den statiska filen istället.
    return env.ASSETS.fetch(request);
  },
};
