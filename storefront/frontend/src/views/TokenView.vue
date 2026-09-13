<template>
  <div>
    <section id="model-logos" class="top-strip">
      <div class="container">
        <div class="top-strip-head">
          <h2>Popular China &amp; US models</h2>
          <span>China &amp; US models &middot; all via one token with member discounts</span>
        </div>
        <div class="model-logos">
          <div v-for="m in modelsLogos" :key="m.name" class="model-logo-card">
            <span class="model-logo-chip" :style="{ background: m.color }">{{ m.logo }}</span>
            <div class="model-logo-meta">
              <b>{{ m.name }}</b>
              <small>{{ m.vendor }}</small>
            </div>
            <span class="model-origin" :class="m.origin.toLowerCase()">{{ m.origin }}</span>
            <span class="model-discount">-{{ m.discount }}%</span>
          </div>
        </div>
      </div>
    </section>

    <header class="hero">
      <div class="container">
        <span class="badge">&#9889; Token &middot; OpenAI-compatible API credits</span>
        <h1>API credits for <span>every LLM model</span>, ready in minutes</h1>
        <p>Buy credits, redeem them in the One API panel, and call any model through a single OpenAI-compatible endpoint. Credits never expire.</p>
        <a class="btn-hero" href="/#plans">View Packages</a>
        <div class="stats">
          <div class="stat"><b>4</b><span>Packages</span></div>
          <div class="stat"><b>&lt;1 min</b><span>Delivery</span></div>
          <div class="stat"><b>Unlimited</b><span>Models</span></div>
          <div class="stat"><b>Never</b><span>Expiry</span></div>
        </div>
      </div>
    </header>

    <section id="models">
      <div class="container">
        <h2 class="section-title">Available models</h2>
        <p class="section-sub">One endpoint. Every model your account can reach.</p>
        <div v-if="models.length" class="model-chips">
          <span v-for="m in models" :key="m" class="model-chip">{{ m }}</span>
        </div>
        <p v-else-if="modelsLoaded" class="section-sub">Models appear here once channels are configured on the platform.</p>
        <p v-else class="section-sub">Loading models...</p>
      </div>
    </section>

    <section id="plans">
      <div class="container">
        <h2 class="section-title">Credit packages</h2>
        <p class="section-sub">Choose an amount, pay online, redeem instantly.</p>
        <product-grid :packages="packages" />
      </div>
    </section>

    <section id="how">
      <div class="container">
        <h2 class="section-title">How to redeem</h2>
        <p class="section-sub">Three steps from purchase to your first API call.</p>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <h3>Buy credits</h3>
            <p>Pick a package above and complete the secure payment.</p>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3>Redeem the code</h3>
            <p>Log in to the One API panel, open Account &rarr; Redemption, and paste your code.</p>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3>Call the API</h3>
            <p>Create an API token and point your app to <code>/v1/chat/completions</code>.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="faq">
      <div class="container">
        <h2 class="section-title">FAQ</h2>
        <p class="section-sub">Questions? We have answers.</p>
        <div class="faq-item"><h3>How is a credit worth USD?</h3><p>1 USD equals {{ quotaText }} quota units on the One API panel. The exact conversion is shown on the package card.</p></div>
        <div class="faq-item"><h3>Which models can I use?</h3><p>Any model connected to the platform through the channels. The list above is refreshed from the live system.</p></div>
        <div class="faq-item"><h3>Do credits expire?</h3><p>No. Your credits have no expiration date.</p></div>
        <div class="faq-item"><h3>Can I get a refund?</h3><p>Unused credits can be refunded within 14 days of purchase. Contact support to request a refund.</p></div>
      </div>
    </section>
  </div>
</template>

<script>
import ProductGrid from '../components/ProductGrid.vue';

const MODELS_LOGOS = [
  { name: 'DeepSeek-V3', vendor: 'DeepSeek', logo: 'D', color: '#4d6bfe', discount: 35, origin: 'CN' },
  { name: 'Qwen2.5', vendor: 'Alibaba', logo: 'Q', color: '#6f2da8', discount: 30, origin: 'CN' },
  { name: 'Kimi K2', vendor: 'Moonshot', logo: 'K', color: '#1f2937', discount: 20, origin: 'CN' },
  { name: 'GLM-4 Plus', vendor: 'Zhipu', logo: 'G', color: '#0d9488', discount: 25, origin: 'CN' },
  { name: 'Doubao 1.5', vendor: 'ByteDance', logo: 'B', color: '#3257c8', discount: 30, origin: 'CN' },
  { name: 'GPT-4o', vendor: 'OpenAI', logo: 'G', color: '#10a37f', discount: 20, origin: 'US' },
  { name: 'Claude 3.7', vendor: 'Anthropic', logo: 'C', color: '#d97757', discount: 15, origin: 'US' },
  { name: 'Gemini 2.0', vendor: 'Google', logo: 'G', color: '#4285f4', discount: 10, origin: 'US' },
  { name: 'Llama 3.1', vendor: 'Meta', logo: 'L', color: '#0866ff', discount: 25, origin: 'US' },
  { name: 'Grok 2', vendor: 'xAI', logo: 'X', color: '#111111', discount: 15, origin: 'US' },
];

export default {
  components: { ProductGrid },
  data() {
    return { packages: [], models: [], modelsLoaded: false, modelsLogos: MODELS_LOGOS, quotaText: '500,000' };
  },
  async created() {
    this.loadPackages();
    this.loadModels();
  },
  methods: {
    async loadPackages() {
      try {
        const res = await fetch('/api/packages?category=token');
        const data = await res.json();
        this.packages = data.packages || [];
      } catch (err) {
        /* handled by grid */
      }
    },
    async loadModels() {
      try {
        const res = await fetch('/api/models');
        const data = await res.json();
        this.models = data.models || [];
      } catch (err) {
        this.models = [];
      } finally {
        this.modelsLoaded = true;
      }
    },
  },
};
</script>
