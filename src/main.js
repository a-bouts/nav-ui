import Vue from 'vue'
import App from './App.vue'
import Races from './Races.vue'
import Boats from './Boats.vue'
import Nav from './components/Nav.vue'
import VueResource from 'vue-resource'
import VueRouter from 'vue-router'

import 'bulma/css/bulma.css'
import 'bulma-slider/dist/css/bulma-slider.min.css'
import 'bulma-checkradio/dist/css/bulma-checkradio.min.css'

import 'leaflet/dist/leaflet.css'
import 'leaflet-sidebar-v2/css/leaflet-sidebar.css'
import 'leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css'
import 'leaflet-velocity/dist/leaflet-velocity.css'
import 'leaflet.fullscreen/Control.FullScreen.css'
import 'leaflet-search/dist/leaflet-search.min.css'

import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'

import {EventBus} from './event-bus.js';

Vue.use(VueResource)
Vue.use(VueRouter)

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

window.addEventListener("message", function(e)
{
  if (e.data.type === "from-dash") {
    console.log("emit message ", e.data.detail.type, e.data.detail.message)
    EventBus.$emit(e.data.detail.type, e.data.detail.message)
  }
})
EventBus.$on("started", () => { window.postMessage({type: "to-dash", detail: {type: "connect"}}, "*") })
EventBus.$on("race-selected", (message) => { window.postMessage({type: "to-dash", detail: {type: "race-selected", message: message}}, "*") })

new Vue({
  render: h => h(App),
  router
}).$mount('#app')
