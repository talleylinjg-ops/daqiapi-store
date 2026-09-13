<template>
  <div>
    <section id="countries" class="top-strip">
      <div class="container">
        <div class="top-strip-head">
          <h2>World coverage</h2>
          <span>Tap a country to see its available eSIM plans</span>
        </div>
        <div v-if="error" class="demo-banner">{{ error }}</div>
        <div class="country-row">
          <button
            v-for="c in featured"
            :key="c.code"
            class="country-chip"
            :class="{ active: selectedCountry && selectedCountry.code === c.code }"
            @click="selectCountry(c)"
          >
            <img
              class="country-flag"
              :src="`/flags/${c.code}.png`"
              :alt="c.name"
              :title="c.name"
              loading="lazy"
            />
            <span class="country-name">{{ c.name }}</span>
            <span class="country-buy">&rarr;</span>
          </button>
        </div>
      </div>
    </section>

    <header class="hero">
      <div class="container">
        <span class="badge">&#128246; eSIM &middot; Upstream price comparison</span>
        <h1>Global eSIM plans at the <span>cheapest wholesale price</span></h1>
        <p>We pull live prices from multiple upstream suppliers, compare wholesale rates for every plan, and automatically sell you the cheapest option.</p>
        <a class="btn-hero" href="/#plans">Compare Prices</a>
        <div class="stats">
          <div class="stat"><b>3+</b><span>Suppliers compared</span></div>
          <div class="stat"><b>{{ countryTotal }}+</b><span>Countries</span></div>
          <div class="stat"><b>Auto</b><span>Cheapest sourcing</span></div>
          <div class="stat"><b>QR</b><span>Instant delivery</span></div>
        </div>
      </div>
    </header>

    <section id="all-countries">
      <div class="container">
        <h2 class="section-title">All countries</h2>
        <p class="section-sub">{{ countryTotal }} destinations across the globe. Tap one to see its available plans.</p>
        <div v-for="g in allGroups" :key="g.region" class="all-group">
          <h3 class="all-group-title">{{ g.label }} <small>{{ g.items.length }} destinations</small></h3>
          <div class="country-row">
            <button
              v-for="c in g.items"
              :key="c.code"
              class="country-chip"
              :class="{ active: selectedCountry && selectedCountry.code === c.code }"
              @click="selectCountry(c)"
            >
              <img
                class="country-flag"
                :src="`/flags/${c.code}.png`"
                :alt="c.name"
                :title="c.name"
                loading="lazy"
              />
              <span class="country-name">{{ c.name }}</span>
              <span class="country-buy">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section id="compare">
      <div class="container">
        <h2 class="section-title">Live wholesale comparison</h2>
        <p class="section-sub">The best price per plan is highlighted. Updated automatically from upstream suppliers.</p>
        <div v-if="!plans.length" class="section-sub">Loading comparison...</div>
        <div v-else class="table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th v-for="col in providerCols" :key="col">{{ col }}</th>
                <th>Your price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in plans" :key="p.key">
                <td class="plan-cell">
                  <b>{{ p.name }}</b>
                  <small>{{ p.dataLabel }} &middot; {{ p.validity }} days &middot; {{ p.regionName }}</small>
                </td>
                <td v-for="col in providerCols" :key="col"
                    :class="{ best: isBest(p, col) }">
                  {{ priceFor(p, col) }}
                </td>
                <td class="retail-cell">${{ p.retail }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="section-sub table-note">Wholesale prices in USD per plan. &ldquo;Your price&rdquo; = cheapest wholesale + {{ marginText }} margin.</p>
      </div>
    </section>

    <section id="plans">
      <div class="container">
        <h2 class="section-title">eSIM plans</h2>
        <p class="section-sub">Instant QR delivery to your email after payment.</p>
        <div v-if="selectedCountry" class="region-banner">
          <b>&#128205; {{ selectedCountry.name }}</b> &mdash; these plans cover your destination. Pick a data size and click Buy.
          <button class="clear-btn" @click="selectedCountry = null">Show all plans</button>
        </div>
        <product-grid :packages="visiblePackages" />
      </div>
    </section>

    <section id="how">
      <div class="container">
        <h2 class="section-title">How to install</h2>
        <p class="section-sub">Your eSIM is ready before you board the plane.</p>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <h3>Buy a plan</h3>
            <p>Pick the region and data size you need. We source the cheapest upstream option automatically.</p>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3>Scan the QR</h3>
            <p>You receive an eSIM profile (QR / LPA code) instantly. Open Settings &rarr; Mobile Data &rarr; Add eSIM.</p>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3>Travel connected</h3>
            <p>The plan activates automatically when you reach a covered country. No physical SIM needed.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="faq">
      <div class="container">
        <h2 class="section-title">FAQ</h2>
        <p class="section-sub">Questions? We have answers.</p>
        <div class="faq-item"><h3>Why is the price so low?</h3><p>We compare wholesale rates from multiple upstream suppliers in real time and always fulfil from the cheapest one, passing the savings to you.</p></div>
        <div class="faq-item"><h3>Which devices support eSIM?</h3><p>iPhone XS and newer, recent Android devices from Samsung, Google, Huawei, Xiaomi and others. Check your IMEI if unsure.</p></div>
        <div class="faq-item"><h3>Can I top up or extend?</h3><p>Every plan is purchased separately. If you run out of data, simply buy the same plan again and install a new profile.</p></div>
        <div class="faq-item"><h3>Is my phone number kept?</h3><p>eSIM data plans are data-only and do not change your existing number. Use it alongside your current SIM.</p></div>
      </div>
    </section>
  </div>
</template>

<script>
import ProductGrid from '../components/ProductGrid.vue';

export default {
  components: { ProductGrid },
  data() {
    return {
      plans: [],
      packages: [],
      margin: 0.18,
      countries: [],
      regionLabels: {},
      selectedCountry: null,
      error: '',
    };
  },
  computed: {
    featured() {
      return this.countries.filter((c) => c.featured);
    },
    countryTotal() {
      return this.countries.length;
    },
    visiblePackages() {
      if (!this.selectedCountry) return this.packages;
      return this.packages.filter((p) => p.region === this.selectedCountry.region);
    },
    selectedRegionLabel() {
      if (!this.selectedCountry) return '';
      return this.regionLabels[this.selectedCountry.region] || this.selectedCountry.region;
    },
    allGroups() {
      const rest = this.countries.filter((c) => !c.featured);
      const order = ['europe', 'asia', 'global', 'usa'];
      const groups = [];
      for (const region of order) {
        const items = rest.filter((c) => c.region === region);
        if (items.length) {
          groups.push({ region, label: this.regionLabels[region] || region, items });
        }
      }
      return groups;
    },
    providerCols() {
      const set = new Set();
      this.plans.forEach((p) => p.options.forEach((o) => set.add(o.providerLabel)));
      return [...set];
    },
    marginText() {
      return Math.round(this.margin * 100) + '%';
    },
  },
  async created() {
    this.loadCountries();
    this.loadPlans();
    this.loadPackages();
  },
  methods: {
    async loadCountries() {
      try {
        const res = await fetch('/api/esim/countries');
        const data = await res.json();
        this.countries = data.countries || [];
        this.regionLabels = data.regionLabels || {};
      } catch (err) {
        this.countries = [];
      }
    },
    async loadPlans() {
      try {
        const res = await fetch('/api/esim/compare');
        const data = await res.json();
        this.plans = data.plans || [];
        this.margin = data.margin || this.margin;
      } catch (err) {
        this.plans = [];
      }
    },
    async loadPackages() {
      try {
        const res = await fetch('/api/packages?category=esim');
        const data = await res.json();
        this.packages = data.packages || [];
      } catch (err) {
        this.packages = [];
      }
    },
    isBest(plan, label) {
      return plan.best && plan.best.providerLabel === label;
    },
    priceFor(plan, label) {
      const opt = plan.options.find((o) => o.providerLabel === label);
      return opt ? '$' + opt.wholesale : '\u2013';
    },
    selectCountry(country) {
      this.selectedCountry = country;
      this.error = '';
      const el = document.getElementById('plans');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  },
};
</script>
