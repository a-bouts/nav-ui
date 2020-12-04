import Vue from 'vue'
import App from './App.vue'
import VueResource from 'vue-resource';

import 'bulma/css/bulma.css';
import 'bulma-slider/dist/css/bulma-slider.min.css'
import 'bulma-checkradio/dist/css/bulma-checkradio.min.css'

import 'leaflet/dist/leaflet.css';
import 'leaflet-sidebar-v2/css/leaflet-sidebar.css';
import 'leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css';
import 'leaflet-velocity/dist/leaflet-velocity.css';

import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'

Vue.use(VueResource);

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
