<template>
  <div class="container order-page">
    <div class="order-box" v-if="order">
      <div v-if="order.status === 'paid'">
        <div class="ok">&#10003;</div>
        <h1>Payment received!</h1>
        <p>{{ deliveryTitle }}</p>
        <span class="code">{{ primaryCode }}</span>

        <div v-if="fulfillment && fulfillment.details" class="fulfillment-details">
          <template v-if="order.category === 'esim'">
            <div class="detail-row" v-if="fulfillment.details.iccid"><span>ICCID</span><b>{{ fulfillment.details.iccid }}</b></div>
            <div class="detail-row" v-if="fulfillment.details.activationCode || fulfillment.details.lpa"><span>LPA / Activation</span><b>{{ fulfillment.details.activationCode || fulfillment.details.lpa }}</b></div>
            <div class="detail-row" v-if="fulfillment.details.network"><span>Network</span><b>{{ fulfillment.details.network }}</b></div>
          </template>
          <template v-else-if="order.category === 'vpn'">
            <div class="detail-row" v-if="fulfillment.details.username"><span>Username</span><b>{{ fulfillment.details.username }}</b></div>
            <div class="detail-row" v-if="fulfillment.details.password"><span>Password</span><b>{{ fulfillment.details.password }}</b></div>
            <div class="detail-row" v-if="fulfillment.details.configUrl"><span>Config</span><b>{{ fulfillment.details.configUrl }}</b></div>
            <div class="detail-row" v-if="fulfillment.details.endpoint"><span>Endpoint</span><b>{{ fulfillment.details.endpoint }}:{{ fulfillment.details.port }}</b></div>
          </template>
        </div>

        <div v-if="order.category === 'vpn' && fulfillment && fulfillment.details.configText" class="config-block">
          <div class="config-label">WireGuard configuration</div>
          <pre>{{ fulfillment.details.configText }}</pre>
        </div>

        <div class="steps-guide">
          <ol>
            <li v-for="(s, i) in instructions" :key="i">{{ s }}</li>
          </ol>
        </div>
        <a class="btn-back" href="/">Back to home</a>
      </div>
      <div v-else>
        <div class="spinner"></div>
        <h1>Payment processing</h1>
        <p>We are confirming your payment. This page refreshes automatically...</p>
      </div>
    </div>
    <div class="order-box" v-else>
      <div class="spinner"></div>
      <p>Loading order...</p>
    </div>
  </div>
</template>

<script>
const FALLBACK_STEPS = {
  token: [
    'Go to the One API panel and log in (or create an account).',
    'Open Account -> Redemption.',
    'Paste the code above and click Redeem.',
    'Create an API token and start calling /v1/chat/completions.',
  ],
  esim: [
    "Open your phone's eSIM settings (Settings -> Mobile Data -> Add eSIM).",
    'Choose "Scan a QR code" or "Enter code manually".',
    'Enter the activation code above to download your eSIM profile.',
    'Your data plan activates automatically when you reach your destination.',
  ],
  vpn: [
    'Download the VPN app for your device (Windows, macOS, iOS, Android).',
    'Open Settings -> Activate and enter the access code above.',
    'Log in with the username and password from your order details.',
    'Pick a server location from 60+ countries and connect.',
  ],
};

export default {
  data() {
    return { order: null };
  },
  computed: {
    deliveryTitle() {
      if (!this.order) return '';
      if (this.order.category === 'esim') return 'Here is your eSIM activation code:';
      if (this.order.category === 'vpn') return 'Here is your VPN access code:';
      return 'Here is your redemption code:';
    },
    fulfillment() {
      return (this.order && this.order.fulfillment) || null;
    },
    primaryCode() {
      if (!this.order) return '';
      const d = this.fulfillment && this.fulfillment.details;
      if (this.order.category === 'esim' && d && (d.activationCode || d.lpa)) {
        return d.activationCode || d.lpa;
      }
      return this.order.code || '';
    },
    instructions() {
      if (!this.order) return [];
      const fromSupplier = this.fulfillment && this.fulfillment.instructions;
      if (fromSupplier && fromSupplier.length) return fromSupplier;
      return FALLBACK_STEPS[this.order.category] || FALLBACK_STEPS.token;
    },
  },
  created() {
    this.fetchOrder();
  },
  methods: {
    async fetchOrder() {
      while (!this.order || this.order.status === 'pending') {
        const res = await fetch(`/api/order/${this.$route.params.id}`);
        if (res.ok) {
          this.order = await res.json();
        }
        if (this.order && this.order.status === 'pending') {
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          break;
        }
      }
    },
  },
};
</script>
