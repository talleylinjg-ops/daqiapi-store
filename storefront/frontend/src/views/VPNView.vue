<template>
  <div>
    <header class="hero">
      <div class="container">
        <span class="badge">&#128737; VPN &middot; Self-hosted on Oracle Cloud</span>
        <h1>US IP on a <span>free self-hosted server</span> we operate</h1>
        <p>Every plan runs on our own WireGuard servers hosted on Oracle Cloud &ldquo;Always Free&rdquo; instances. Zero monthly server cost, full control, no third-party logs.</p>
        <a class="btn-hero" href="/#plans">View Plans</a>
        <div class="stats">
          <div class="stat"><b>$0</b><span>Server cost</span></div>
          <div class="stat"><b>US</b><span>IP region</span></div>
          <div class="stat"><b>1 Gbps</b><span>Bandwidth</span></div>
          <div class="stat"><b>WG</b><span>WireGuard</span></div>
        </div>
      </div>
    </header>

    <section id="why">
      <div class="container">
        <h2 class="section-title">Why self-hosted?</h2>
        <p class="section-sub">We run our own infrastructure instead of reselling third-party VPNs.</p>
        <div class="features-grid">
          <div class="feature"><div class="icon">&#128176;</div><h3>$0 monthly server cost</h3><p>Oracle Cloud Always Free instances are free for life. You only pay for access, not for someone else's server bill.</p></div>
          <div class="feature"><div class="icon">&#127482;&#127480;</div><h3>US IP addresses</h3><p>Servers live in Oracle US regions (Ashburn / Phoenix), giving you reliable US IPs for streaming, browsing and work.</p></div>
          <div class="feature"><div class="icon">&#9889;</div><h3>WireGuard speed</h3><p>WireGuard is the fastest, leanest VPN protocol. Near-zero latency overhead on modern kernels.</p></div>
          <div class="feature"><div class="icon">&#128274;</div><h3>Full control &amp; no logs</h3><p>We operate the servers, so there are no reseller middlemen and no third-party logging.</p></div>
        </div>
      </div>
    </section>

    <section id="infra">
      <div class="container">
        <h2 class="section-title">Our infrastructure</h2>
        <p class="section-sub">Live status of the VPN backend.</p>
        <div class="infra-panel">
          <div class="detail-row"><span>Hosting</span><b>{{ status.infra }}</b></div>
          <div class="detail-row"><span>Region</span><b>{{ status.region }}</b></div>
          <div class="detail-row"><span>Protocol</span><b>{{ status.protocol }}</b></div>
          <div class="detail-row"><span>Monthly server cost</span><b>${{ status.monthlyServerCostUsd }}.00</b></div>
          <div class="detail-row"><span>Delivery mode</span><b>{{ status.mode === 'oracle' ? 'Provisioned on Oracle Cloud' : 'Demo (local config generation)' }}</b></div>
        </div>
      </div>
    </section>

    <section id="plans">
      <div class="container">
        <h2 class="section-title">VPN plans</h2>
        <p class="section-sub">Instant WireGuard configuration delivered after payment.</p>
        <product-grid :packages="packages" />
      </div>
    </section>

    <section id="how">
      <div class="container">
        <h2 class="section-title">How it works</h2>
        <p class="section-sub">From checkout to connected in minutes.</p>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <h3>Buy a plan</h3>
            <p>Choose a subscription length. Each order provisions a dedicated client key on our Oracle free-tier server.</p>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3>Get your config</h3>
            <p>You receive a complete WireGuard client configuration with your own keys and a US endpoint.</p>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3>Import &amp; connect</h3>
            <p>Import the config into WireGuard on any device, hit Connect, and you are on a US IP.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="faq">
      <div class="container">
        <h2 class="section-title">FAQ</h2>
        <p class="section-sub">Questions? We have answers.</p>
        <div class="faq-item"><h3>Is the server really free?</h3><p>Yes. Oracle Cloud&rsquo;s Always Free tier includes 2 AMD VMs and 10 TB outbound traffic per month at no cost. We run one VM per VPN cluster.</p></div>
        <div class="faq-item"><h3>What devices can I use?</h3><p>WireGuard works on Windows, macOS, iOS, Android and Linux. One config can be installed on multiple devices of one plan holder.</p></div>
        <div class="faq-item"><h3>Can I get a US IP?</h3><p>Yes. Servers are in Oracle US regions, so you receive a US IP address as soon as you connect.</p></div>
        <div class="faq-item"><h3>Do you keep logs?</h3><p>No. We run the servers ourselves with no logging. Traffic stays between you and the server.</p></div>
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
      packages: [],
      status: {
        infra: 'Oracle Cloud Always Free',
        region: 'US East (Ashburn)',
        protocol: 'WireGuard',
        monthlyServerCostUsd: 0,
        mode: 'demo',
      },
    };
  },
  async created() {
    this.loadPackages();
    this.loadStatus();
  },
  methods: {
    async loadPackages() {
      try {
        const res = await fetch('/api/packages?category=vpn');
        const data = await res.json();
        this.packages = data.packages || [];
      } catch (err) {
        this.packages = [];
      }
    },
    async loadStatus() {
      try {
        const res = await fetch('/api/vpn/status');
        const data = await res.json();
        this.status = { ...this.status, ...data };
      } catch (err) {
        /* keep defaults */
      }
    },
  },
};
</script>
