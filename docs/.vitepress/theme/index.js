// https://vitepress.dev/guide/custom-theme
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import KillercodaEmbed from '../components/KillercodaEmbed.vue'
import SponsorBanner from '../components/SponsorBanner.vue'

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register globally so Markdown files can use <KillercodaEmbed /> directly
    app.component('KillercodaEmbed', KillercodaEmbed)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(SponsorBanner),
    })
  },
}
