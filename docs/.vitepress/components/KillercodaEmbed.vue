<script setup>
const props = defineProps({
  src: { type: String, required: true },
  title: { type: String, default: '实验环境' },
})

function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('killercoda.com')
  } catch {
    return false
  }
}

// Strip ~embed suffix for the direct link
const directUrl = isValidUrl(props.src) ? props.src.replace(/~embed$/, '') : null
</script>

<template>
  <div v-if="directUrl" class="killercoda-link">
    <div class="link-icon">🧪</div>
    <div class="link-body">
      <p class="link-title">{{ title }}</p>
      <p class="link-desc">点击下方按钮在新标签页中打开 Killercoda 实验环境，预装了 conftest + OPA。</p>
      <a :href="directUrl" target="_blank" rel="noopener noreferrer" class="link-button">
        打开实验环境 ↗
      </a>
    </div>
  </div>
</template>

<style scoped>
.killercoda-link {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
}

.link-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.link-body {
  flex: 1;
}

.link-title {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.link-desc {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.link-button {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff !important;
  font-weight: 500;
  font-size: 0.95rem;
  text-decoration: none !important;
  transition: background 0.2s;
}

.link-button:hover {
  background: var(--vp-c-brand-2);
}
</style>
