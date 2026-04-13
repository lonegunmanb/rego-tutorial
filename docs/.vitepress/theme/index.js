// https://vitepress.dev/guide/custom-theme
import DefaultTheme from 'vitepress/theme'
import KillercodaEmbed from '../components/KillercodaEmbed.vue'

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register globally so Markdown files can use <KillercodaEmbed /> directly
    app.component('KillercodaEmbed', KillercodaEmbed)
  },
}
