/**
 * VeilReceipt Checkout Widget — Embeddable payment SDK
 * Include this script on any webpage to enable Aleo private payments.
 *
 * Usage:
 *   <script src="https://veil-receipt.vercel.app/veil-checkout.js"></script>
 *   <script>
 *     VeilCheckout.open({ sessionId: 'ps_abc123' });
 *   </script>
 */
(function(window) {
  'use strict';

  var CHECKOUT_BASE = 'https://veil-receipt.vercel.app';
  var API_BASE = 'https://veilreceipt-api.onrender.com';

  // Allow override via data attributes on the script tag
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.indexOf('veil-checkout') !== -1) {
      if (scripts[i].getAttribute('data-checkout-url')) {
        CHECKOUT_BASE = scripts[i].getAttribute('data-checkout-url');
      }
      if (scripts[i].getAttribute('data-api-url')) {
        API_BASE = scripts[i].getAttribute('data-api-url');
      }
    }
  }

  var VeilCheckout = {
    /**
     * Open the VeilReceipt checkout in a popup or iframe
     * @param {Object} options
     * @param {string} options.sessionId - Payment session ID (ps_...)
     * @param {Function} [options.onSuccess] - Called when payment completes
     * @param {Function} [options.onCancel] - Called when user cancels
     * @param {string} [options.mode] - 'popup' (default) or 'redirect'
     */
    open: function(options) {
      if (!options || !options.sessionId) {
        console.error('[VeilCheckout] sessionId is required');
        return;
      }

      var checkoutUrl = CHECKOUT_BASE + '/pay/' + encodeURIComponent(options.sessionId);
      var mode = options.mode || 'redirect';

      if (mode === 'popup') {
        var width = 480;
        var height = 680;
        var left = (screen.width - width) / 2;
        var top = (screen.height - height) / 2;
        var popup = window.open(
          checkoutUrl,
          'veilreceipt_checkout',
          'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes'
        );

        // Listen for completion message
        var listener = function(event) {
          if (event.origin !== CHECKOUT_BASE) return;
          if (event.data && event.data.type === 'veilreceipt_payment_complete') {
            window.removeEventListener('message', listener);
            if (popup) popup.close();
            if (options.onSuccess) options.onSuccess(event.data.payload);
          }
          if (event.data && event.data.type === 'veilreceipt_payment_cancel') {
            window.removeEventListener('message', listener);
            if (popup) popup.close();
            if (options.onCancel) options.onCancel();
          }
        };
        window.addEventListener('message', listener);

        // Check if popup was closed
        var interval = setInterval(function() {
          if (popup && popup.closed) {
            clearInterval(interval);
            window.removeEventListener('message', listener);
            if (options.onCancel) options.onCancel();
          }
        }, 500);
      } else {
        // Redirect mode
        window.location.href = checkoutUrl;
      }
    },

    /**
     * Create a payment session from the frontend and redirect
     * NOTE: This exposes your API key in client-side code — use only for demo/testing.
     * For production, create sessions from your backend.
     * @param {Object} options
     * @param {string} options.apiKey - Your VeilReceipt API key
     * @param {number} options.amount - Amount in microcredits
     * @param {string} [options.currency] - 'credits', 'usdcx', or 'usad'
     * @param {string} [options.description] - Payment description
     * @param {string} [options.redirectUrl] - URL to redirect after payment
     * @param {string} [options.cancelUrl] - URL if user cancels
     * @param {Object} [options.metadata] - Custom metadata
     */
    createAndRedirect: function(options) {
      if (!options || !options.apiKey || !options.amount) {
        console.error('[VeilCheckout] apiKey and amount are required');
        return;
      }

      var body = {
        amount: options.amount,
        currency: options.currency || 'credits',
        description: options.description || '',
        metadata: options.metadata || {},
      };
      if (options.redirectUrl) body.redirect_url = options.redirectUrl;
      if (options.cancelUrl) body.cancel_url = options.cancelUrl;

      fetch(API_BASE + '/integrate/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': options.apiKey,
        },
        body: JSON.stringify(body),
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          console.error('[VeilCheckout] Failed to create session:', data.error || 'Unknown error');
        }
      })
      .catch(function(err) {
        console.error('[VeilCheckout] API error:', err);
      });
    },

    /**
     * Check payment session status
     * @param {string} sessionId
     * @returns {Promise<Object>}
     */
    getStatus: function(sessionId) {
      return fetch(API_BASE + '/integrate/payments/' + encodeURIComponent(sessionId))
        .then(function(res) { return res.json(); });
    },

    /**
     * Verify a purchase commitment on-chain
     * @param {string} commitment
     * @returns {Promise<Object>}
     */
    verify: function(commitment) {
      return fetch(API_BASE + '/integrate/verify/' + encodeURIComponent(commitment))
        .then(function(res) { return res.json(); });
    },
  };

  window.VeilCheckout = VeilCheckout;
})(window);
