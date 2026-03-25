/* EvoFitMeals — Funnel State Management + Stripe Checkout */

(function () {
  'use strict';

  var TIER_KEY  = 'evofit_funnel_tier';
  var SAAS_KEY  = 'evofit_funnel_saas';

  /** Select a one-time tier and navigate to the next upsell page. */
  window.selectTier = function (tier, nextUrl) {
    sessionStorage.setItem(TIER_KEY, tier);
    window.location.href = nextUrl;
  };

  /** Add the SaaS add-on and navigate to the next page. */
  window.addSaas = function (accepted, nextUrl) {
    sessionStorage.setItem(SAAS_KEY, accepted ? 'yes' : 'no');
    window.location.href = nextUrl;
  };

  /** Return the current funnel selection. */
  window.getSelection = function () {
    return {
      tier: sessionStorage.getItem(TIER_KEY) || 'starter',
      saas: sessionStorage.getItem(SAAS_KEY) === 'yes'
    };
  };

  /**
   * Call the backend to create a Stripe Checkout session,
   * then redirect the browser to Stripe's hosted checkout page.
   */
  window.goToCheckout = function () {
    var sel = window.getSelection();
    var btn = document.querySelector('.funnel-cta');

    // Disable button while loading
    if (btn) {
      btn.classList.add('loading');
      btn.textContent = 'Redirecting to checkout…';
      btn.style.pointerEvents = 'none';
    }

    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: sel.tier,
        saas: sel.saas
      })
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.message || 'Checkout failed');
        });
      }
      return res.json();
    })
    .then(function (data) {
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    })
    .catch(function (err) {
      console.error('[Funnel] Checkout error:', err);
      alert('Something went wrong creating your checkout session. Please try again.');
      if (btn) {
        btn.classList.remove('loading');
        btn.textContent = 'Complete Purchase';
        btn.style.pointerEvents = '';
      }
    });
  };

  /** Render order summary on the welcome page. */
  window.renderOrderSummary = function () {
    var sel   = window.getSelection();
    var el    = document.getElementById('order-summary');
    if (!el) return;

    var tierNames  = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
    var tierPrices = { starter: 199, professional: 299, enterprise: 399 };

    var tierName  = tierNames[sel.tier]  || 'Starter';
    var tierPrice = tierPrices[sel.tier] || 199;
    var total     = tierPrice;

    var html = '<div class="line-item"><span>' + tierName + ' (one-time)</span><span>$' + tierPrice + '</span></div>';

    if (sel.saas) {
      html += '<div class="line-item"><span>SaaS AI Engine (monthly)</span><span>$39/mo</span></div>';
      html += '<div class="line-item line-total"><span>Today\'s Total</span><span>$' + total + ' + $39/mo</span></div>';
    } else {
      html += '<div class="line-item line-total"><span>Today\'s Total</span><span>$' + total + '</span></div>';
    }

    el.innerHTML = html;
  };
})();
