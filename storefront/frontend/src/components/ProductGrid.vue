<template>
  <div>
    <div v-if="error" class="demo-banner">{{ error }}</div>
    <div class="pricing-grid">
      <div v-for="p in packages" :key="p.id" class="card" :class="{ popular: p.popular }">
        <span v-if="p.popular" class="popular-tag">Most popular</span>
        <h3>{{ p.name }}</h3>
        <div class="price"><small>$</small>{{ p.priceUsd }}<small> USD</small></div>
        <div class="quota-note">{{ p.note ? p.note : '\u2248 ' + p.quotaUsd + ' of API credits' }}</div>
        <ul>
          <li v-for="f in p.features" :key="f">{{ f }}</li>
        </ul>
        <button class="btn-buy" :disabled="buying === p.id" @click="buy(p)">
          {{ buying === p.id ? 'Processing...' : 'Buy now' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    packages: { type: Array, default: () => [] },
  },
  data() {
    return { buying: null, error: '' };
  },
  methods: {
    async buy(pkg) {
      this.buying = pkg.id;
      this.error = '';
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        if (data.mode === 'stripe' && data.url) {
          window.location.href = data.url;
        } else {
          window.location.href = data.url || `/order/${data.orderId}`;
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.buying = null;
      }
    },
  },
};
</script>
