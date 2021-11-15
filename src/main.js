import Vue from 'vue'
import App from './App.vue'
import Races from './Races.vue'
import Boats from './Boats.vue'
import Nav from './components/Nav.vue'
import VueResource from 'vue-resource'
import VueRouter from 'vue-router'
import JsonCSV from 'vue-json-csv'
import Moment from 'moment'

import 'bulma/css/bulma.css'
import 'bulma-slider/dist/css/bulma-slider.min.css'
import 'bulma-checkradio/dist/css/bulma-checkradio.min.css'
import 'bulma-calendar/dist/css/bulma-calendar.min.css'

import 'leaflet/dist/leaflet.css'
import 'leaflet-sidebar-v2/css/leaflet-sidebar.css'
import 'leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css'
import 'leaflet-velocity/dist/leaflet-velocity.css'

import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'

Moment.locale(navigator.language || 'fr')

Vue.use(VueResource)
Vue.use(VueRouter)
Vue.component('downloadCsv', JsonCSV)

Vue.config.productionTip = false

const routes = [
  { path: '/', component: Boats, props: true, children: [
    { path: ':boat', component: Races, props: true, children: [
      { path: ':race', component: Nav, props: true }
    ]}
  ]}
]

const router = new VueRouter({
  routes
})

new Vue({
  render: h => h(App),
  router
}).$mount('#app')
