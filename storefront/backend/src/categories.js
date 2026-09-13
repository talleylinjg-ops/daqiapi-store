const categories = [
  {
    id: 'token',
    name: 'Token',
    tagline: 'OpenAI-compatible API credits for LLM models',
    icon: 'bolt',
  },
  {
    id: 'esim',
    name: 'eSIM',
    tagline: 'Global data plans with instant eSIM delivery',
    icon: 'signal',
  },
  {
    id: 'vpn',
    name: 'VPN',
    tagline: 'Private, secure and unrestricted internet access',
    icon: 'shield',
  },
];

function getCategory(id) {
  return categories.find((c) => c.id === id) || null;
}

module.exports = { categories, getCategory };
