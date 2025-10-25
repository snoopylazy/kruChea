import { createApp } from 'vue';
import App from './App.vue';
import router from './router/routes';
import './assets/tailwind.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import VueApexCharts from "vue3-apexcharts";
import { createPinia } from 'pinia';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import "./assets/font.css";
import i18n from './i18n'

const app = createApp(App);
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate); 

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: "p",
      darkModeSelector: "light",
      cssLayer: false,
    },
  },
});

app.use(pinia);
app.use(VueApexCharts);
app.use(router);
app.mount('#app');
app.use(i18n);