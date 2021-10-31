<template>
  <div id="truc">
    <div id="sidebar" class="leaflet-sidebar collapsed">
      <!-- Nav tabs -->
      <div class="leaflet-sidebar-tabs">
        <ul role="tablist"> <!-- top aligned tabs -->
          <li><a href="#home" role="tab"><i class="fa fa-bars"></i></a></li>
          <li><a role="tab" @click="center"><i class="fa fa-dot-circle"></i></a></li>
          <li><a role="tab" @click="pan"><i class="fa fa-expand"></i></a></li>
          <li><a role="tab" @click="showTooltip" class="button is-white"><i class="fa fa-eye"></i></a></li>
          <li><a role="tab" @click="centerSnake"><i class="fas fa-route"></i></a></li>
          <li v-if="isNative()"><a role="tab" @click="geoloc"><i class="fas fa-globe-europe"></i></a></li>
          <li><a role="tab" @click="run" class="button is-white" v-bind:class="{ 'is-loading': loading }">GO</a></li>
        </ul>

        <ul role="tablist"> <!-- bottom aligned tabs -->
          <li><a href="#table" role="tab"><i class="fa fa-table"></i></a></li>
          <li class="bottom"><a href="#polars" role="tab"><i class="fas fa-chart-area"></i></a></li>
          <li class="bottom"><a href="#buoys" role="tab"><i class="fas fa-map-marked"></i></a></li>
          <li class="bottom"><a href="#boats" role="tab"><i class="fa fa-ship"></i></a></li>
          <li class="bottom"><a href="#settings" role="tab"><i class="fas fa-cog"></i></a></li>
          <li class="bottom"><a href="#info" role="tab" class="p-2">
            <img src="/images/phtheirichthys-2-512x512.png" alt="Placeholder image">
          </a></li>
        </ul>
      </div>

      <!-- Tab panes -->
      <div class="leaflet-sidebar-content">
        <div class="leaflet-sidebar-pane" id="home">
          <h1 class="leaflet-sidebar-header">
            {{ title }}
            <div class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></div>
          </h1>
          <section class="section">
            <div class="field is-grouped">
              <div class="field">
                <label class="label">Cap</label>
                <div class="field has-addons">
                  <p class="control">
                    <input v-model.number="current.bearing" class="input is-small" :class="{'is-success': bearingPasteStatus === 1, 'is-danger': bearingPasteStatus === -1}" type="text" placeholder="41" style="width:60px">
                  </p>
                  <p class="control">
                    <a class="button is-static is-small">°</a>
                  </p>
                </div>
              </div>
              <div class="field">
                <label class="label">Sail</label>
                <div class="control">
                  <div class="select is-small">
                    <select v-model.number="current.sail">
                      <option value="0">Jib</option>
                      <option value="1">Spi</option>
                      <option value="3">Génois Léger</option>
                      <option value="6">Spi Léger</option>
                      <option value="4">Code 0</option>
                      <option value="2">Trinquette</option>
                      <option value="5">Spi Lourd</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <label class="label">Copier - coller</label>
            <div class="field is-grouped">
              <p class="control">
                <input v-model="pasteLatlon" @paste="paste" class="input is-small" type="text">
              </p>
            </div>
            <label class="label">Latitude</label>
            <div class="field is-grouped">
              <div class="field has-addons">
                <p class="control">
                  <input v-model.number="current.position.lat.d" class="input is-small" :class="{'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}" type="text" placeholder="41" style="width:60px">
                </p>
                <p class="control">
                  <a class="button is-small" :class="{'is-static': latPasteStatus === 0, 'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}">°</a>
                </p>
                <p class="control">
                  <span class="select is-small" :class="{'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}">
                    <select v-model="current.position.lat.p" style="width:60px">
                      <option value="1">N</option>
                      <option value="-1">S</option>
                    </select>
                  </span>
                </p>
                <p class="control">
                  <input v-model.number="current.position.lat.m" class="input is-small" :class="{'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}" type="text" placeholder="42" style="width:60px">
                </p>
                <p class="control">
                  <a class="button is-small" :class="{'is-static': latPasteStatus === 0, 'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}">'</a>
                </p>
                <p class="control">
                  <input v-model.number="current.position.lat.s" class="input is-small" :class="{'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}" type="text" placeholder="43" style="width:60px">
                </p>
                <p class="control">
                  <a class="button is-small" :class="{'is-static': latPasteStatus === 0, 'is-success': latPasteStatus === 1, 'is-danger': latPasteStatus === -1}">''</a>
                </p>
              </div>
            </div>
            <label class="label">Longitude</label>
            <div class="field is-grouped">
              <div class="field has-addons">
                <p class="control">
                  <input v-model.number="current.position.lng.d" class="input is-small" :class="{'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}" type="text" placeholder="41" style="width:60px">
                </p>
                <p class="control">
                  <a class="button is-small" :class="{'is-static': lonPasteStatus === 0, 'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}">°</a>
                </p>
                <p class="control">
                  <span class="select is-small" :class="{'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}">
                    <select v-model.number="current.position.lng.p" style="width:60px">
                      <option value="1">E</option>
                      <option value="-1">W</option>
                    </select>
                  </span>
                </p>
                <p class="control">
                  <input v-model.number="current.position.lng.m" class="input is-small" :class="{'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}" type="text" placeholder="42" style="width:60px">
                </p>
                <p class="control">
                  <a class="button is-small" :class="{'is-static': lonPasteStatus === 0, 'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}">'</a>
                </p>
                <p class="control">
                  <input v-model.number="current.position.lng.s" class="input is-small" :class="{'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}" type="text" placeholder="43" style="width:60px">
                </p>
                <p class="control">
                  <a class="button is-small" :class="{'is-static': lonPasteStatus === 0, 'is-success': lonPasteStatus === 1, 'is-danger': lonPasteStatus === -1}">''</a>
                </p>
              </div>
            </div>
            <p class="help">
            <div class="field is-grouped">
              <div class="field has-addons">

                <p class="control">
                  <button class="button is-small" disabled><i class="fas fa-globe-europe"></i><i class="fas fa-globe-europe has-text-grey-lighter"></i><i class="fas fa-globe-europe has-text-grey-lighter"></i></button>
                </p>
                <p class="control">
                  <button class="button is-small" :class="{'is-info': wrap !== true}" @click="wrap = false"><i class="fas fa-globe-europe" style="opacity: 20%"></i><i class="fas fa-globe-europe"></i><i class="fas fa-globe-europe" style="opacity: 20%"></i></button>
                </p>
                <p class="control">
                  <button class="button is-small" :class="{'is-info': wrap === true}" @click="wrap = true"><i class="fas fa-globe-europe" style="opacity: 20%"></i><i class="fas fa-globe-europe" style="opacity: 20%"></i><i class="fas fa-globe-europe"></i></button>
                </p>
              </div>
            </div>
            </p>
            <label class="label">Options</label>
            <div class="columns is-gapless is-multiline is-mobile">
              <div class="column is-one-third">
                <div class="control">
                  <div class="field">
                    <label class="checkbox">
                      <input v-model="current.winch" type="checkbox">
                      Winch
                    </label>
                  </div>
                </div>
              </div>
              <div class="column is-one-third">
                <div class="control">
                  <div class="field">
                    <label class="checkbox">
                      <input v-model="current.foil" type="checkbox">
                      Foil
                    </label>
                  </div>
                </div>
              </div>
              <div class="column is-one-third">
                <div class="control">
                  <div class="field">
                    <label class="checkbox">
                      <input v-model="current.hull" type="checkbox">
                      Hull
                    </label>
                  </div>
                </div>
              </div>
              <div class="column is-one-third">
                <div class="control">
                  <div class="field">
                    <label class="checkbox">
                      <input v-model="pt" type="checkbox">
                      Petit temps
                    </label>
                  </div>
                </div>
              </div>
              <div class="column is-one-third">
                <div class="control">
                  <div class="field">
                    <label class="checkbox">
                      <input v-model="c0" type="checkbox">
                      Code 0
                    </label>
                  </div>
                </div>
              </div>
              <div class="column is-one-third">
                <div class="control">
                  <div class="field">
                    <label class="checkbox">
                      <input v-model="gt" type="checkbox">
                      Gros temps
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="field is-grouped">
            <p class="control">
              <a class="button is-small is-primary" @click="submit()">
                Save
              </a>
            </p>
            <p class="control has-icons-left">
              <input v-model.number="current.delay" class="input is-small" type="text" placeholder="0" style="width:130px">
              <span class="icon is-left">
                <i class="fas fa-clock"></i>
              </span>
            </p>
            <div class="control">
              <div class="field">
                <label class="checkbox">
                  <input v-model="current.stop" type="checkbox">
                    Stop
                </label>
              </div>
            </div>
          </div>
          </section>
        </div>
        <div class="leaflet-sidebar-pane" id="table">
          <Table ref="table" v-bind:display="displayed == 'table'"></Table>
        </div>
        <div class="leaflet-sidebar-pane" id="boats">
          <Boats></Boats>
        </div>
        <div class="leaflet-sidebar-pane polars" id="polars">
          <Polar ref="polars" v-bind:race="race" v-bind:races="races" v-bind:current="current"></Polar>
        </div>
        <div class="leaflet-sidebar-pane" id="buoys">
          <Buoys v-bind:races="races" v-bind:current="current"></Buoys>
        </div>
        <div class="leaflet-sidebar-pane" id="settings">
          <Expes v-bind:priv="priv" v-bind:debug="debug"></Expes>
        </div>
        <div class="leaflet-sidebar-pane" id="info">
          <div class="card">
            <div class="card-image">
              <figure class="image">
                <img src="/images/phtheirichthys-512x170.png" alt="Placeholder image">
              </figure>
            </div>
            <div class="card-content">
              <div class="media">
                <div class="media-content">
                  <p class="title is-4"><a href="https://fr.wikipedia.org/wiki/Phtheirichthys" target="_blank">Phtheirichthys</a></p>
                </div>
              </div>

              <div class="content">
                Petite solution de routage. Si son nom ne vous revient pas, vous pouvez toujours l'appeler <strong>La Sardine</strong>
                <br>
                <a href="https://route.phtheirichthys.fr">route.phtheirichthys.fr</a>
                <br>
                <br>
                Application Android: <a href="https://www.phtheirichthys.fr/phtheirichthys.apk">phtheirichthys.apk</a>
                <br>

              </div>
            </div>
            <Status v-bind:priv="priv"></Status>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import dataService from '../lib/data.js'
import L from 'leaflet'
import 'leaflet-sidebar-v2'
import Polar from './Polar.vue'
import Buoys from './Buoys.vue'
import Expes from './Expes.vue'
import Boats from './Boats.vue'
import Table from './Table.vue'
import Status from './Status.vue'
import {EventBus} from '../event-bus.js';

import { Capacitor , Plugins } from '@capacitor/core';

const { App } = Plugins;
const { Clipboard } = Plugins;

export default {
  name: 'SideBar',
  props: {
    settings: Object,
    race: String,
    boat: String,
    map: Object,
    races: Object,
    position: Object,
    loading: Boolean,
    debug: Boolean,
    priv: Boolean
  },
  components: {
    Polar,
    Buoys,
    Boats,
    Table,
    Expes,
    Status
  },
  data: function() {
    return {
      //races: [],
      sidebar: null,
      selectRaceActive: false,
      polarsLoading: false,
      enablePaste: false,
      current: {
        id: "",
        bearing: 180,
        sail: 0,
        position: {
          lat: {
            d: 0, p: 1, m: 0, s: 0
          },
          lng: {
            d: 0, p: 1, m: 0, s: 0
          }
        },
        winch: false,
        foil: false,
        hull: false,
        sails: 0,
        delta: 3,
        delay: 0,
        stop: false
      },
      pasteLatlon: "",
      displayed: null,
      info: false,
      latPasteStatus: 0,
      lonPasteStatus: 0,
      bearingPasteStatus: 0
    }
  },
  computed: {
    pt: {
      get: function() {
        return this.current && (this.current.sails & 1) == 1
      },
      set: function(val) {
        if(val === true) {
          this.current.sails = this.current.sails | 1
        } else {
          this.current.sails = this.current.sails - (this.current.sails & 1)
        }
      }
    },
    c0: {
      get: function() {
        return this.current && (this.current.sails & 2) == 2
      },
      set: function(val) {
        if(val === true) {
          this.current.sails = this.current.sails | 2
        } else {
          this.current.sails = this.current.sails - (this.current.sails & 2)
        }
      }
    },
    gt: {
      get: function() {
        return this.current && (this.current.sails & 4) == 4
      },
      set: function(val) {
        if(val === true) {
          this.current.sails = this.current.sails | 4
        } else {
          this.current.sails = this.current.sails - (this.current.sails & 4)
        }
      }
    },
    title() {
      var title = this.races[this.race].name
      if (this.boat && this.boat != "-")
        title = this.boat + " - " + title
      return title
    },
    wrap: {
      get: function() {
        console.log("wrap", this.current.position.lng.wrap)
        return this.current.position.lng.wrap === true
      },
      set: function(wrap) {
        console.log("wrap", this.current.position.lng.wrap, "->", wrap)
        this.current.position.lng.wrap = wrap
      }
    }
  },
  mounted: function() {
    const it = this

    EventBus.$on('boat', (latlon) => {
      this.current.position = {
        lat: this.convertDDToDMS(latlon.lat),
        lng: this.convertDDToDMS(latlon.lon),
        startTime: latlon.startTime
      }
      this.save()
    })

    it.load()

    this.sidebar = L.control.sidebar({
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
        container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
    }).addTo(this.map);
    this.sidebar.on('content', function(e) {
      it.displayed = e.id
      if(e.id == "polars") {
        setTimeout(it.$refs.polars.onResize, 500)
      }
      if(e.id == "table") {
        if (!L.DomUtil.hasClass(this._container, 'extended')) {
          L.DomUtil.addClass(this._container, 'extended');
          it.$refs.table.refresh()
        }
      } else {
        if (L.DomUtil.hasClass(this._container, 'extended')) {
          L.DomUtil.removeClass(this._container, 'extended');
        }
      }
    }).on('closing', function() {
      if (L.DomUtil.hasClass(this._container, 'extended')) {
        L.DomUtil.removeClass(this._container, 'extended');
      }
      it.displayed = null
    })

    App.addListener('appStateChange', (state) => {

      if (state.isActive && Capacitor.isNative) {
        Clipboard.read().then(result => {
          var res = it.pasteData(result.value)
          if(res) {
            Clipboard.write({string: ""})
            it.submit()
          }
        })
      }
    });
  },
  methods: {
    isNative: function() {
      return Capacitor.isNative
    },
    convertDMSToDD: function(p, d, m, s, wrap) {
      var res = Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600)
      if (wrap === true && res < 0) {
        res += 360
      }
      return res
    },
    convertDDToDMS: function(D) {
      const res = {}
      if (D > 180) {
        res.wrap = true
        D -= 360
      } else {
        res.wrap = false
      }

      res.p = D<0?-1:1
      res.d = 0|(D<0?D=-D:D)
      res.m = 0|D%1*60
      res.s = (0|D*60%1*6000)/100

      return res
    },
    load() {
      try {
        var current = dataService.getOptions(this.boat, this.race)
        if(current) {
          this.current = current
          if (this.current.position.startTime)
            this.current.position.startTime = new Date(this.current.position.startTime)
        } else {
          var startTime = new Date()
          startTime.setMinutes(startTime.getMinutes() - 1 + this.current.delay*60)
          if (this.settings && this.settings.routeLastUpdate === true) {
            startTime.setMilliseconds(0)
            startTime.setSeconds(0)
            startTime.setMinutes(startTime.getMinutes() - startTime.getMinutes()%5)
          }

          this.current = {
            bearing: 180,
            sail: 0,
            position: {
              lat: this.convertDDToDMS(this.races[this.race].start.lat),
              lng: this.convertDDToDMS(this.races[this.race].start.lon),
              startTime: startTime
            },
            winch: false,
            foil: false,
            hull: false,
            sails: 0,
            delta: 3,
            delay: 0,
            stop: false
          }
        }

        EventBus.$emit('boat', {
          lat: this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
          lon: this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s, this.current.position.lng.wrap),
          startTime: this.current.position.startTime
        })

        //this.pan()
        this.$nextTick(() => {
          this.$emit('configure', this.current)
        });
      } catch(e) {
        console.log(e)
      }
    },
    save() {
      dataService.saveOptions(this.boat, this.race, this.current)
    },
    centerSnake: function() {
      EventBus.$emit('center-snake')
    },
    geoloc: function() {
      App.openUrl({ url: 'fr.phtheirichthys.geoloc://' }).then(ret => {
        console.log('Open url response: ', ret);
      })
    },
    submit: function(keepStartTime) {
      this.sidebar.close();

      if (keepStartTime !== true || !this.current.position.startTime) {
        var startTime = new Date()
        startTime.setMinutes(startTime.getMinutes() - 1 + this.current.delay*60)
        if (this.settings && this.settings.routeLastUpdate === true) {
          startTime.setMilliseconds(0)
          startTime.setSeconds(0)
          startTime.setMinutes(startTime.getMinutes() - startTime.getMinutes()%5)
        }

        this.current.position.startTime = startTime
      }

      EventBus.$emit('boat', {
        lat: this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
        lon: this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s, this.current.position.lng.wrap),
        startTime: startTime
      })

      this.save()

      this.$emit('configure', this.current)
    },
    center: function() {
      var pan = [
        this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
        this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s, this.current.position.lng.wrap)]
      this.map.flyTo(pan, 8)
    },
    pan: function() {
      if(this.current) {
        EventBus.$emit('pan', {
          lat: this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
          lon: this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s, this.current.position.lng.wrap)
        })
      }
    },
    run: function() {
      this.submit(true)
      this.$emit('run')
    },
    showTooltip: function() {
      this.$emit('show-tooltip')
    },
    refreshPolars: function() {
      this.polarsLoading = true
      this.$http.get('/polars/' + this.races[this.race].polars).then(() => {
        this.polarsLoading = false
      }, () => {
        this.polarsLoading = false
        this.$emit('error', {
          level: "error",
          duration: 3000,
          message: "Error loading polars"
        })
        console.log("Error loading polars")
      })
    },
    paste: function(event) {
      var clipboard = event.clipboardData.getData("text/plain")
      this.pasteData(clipboard)
      event.preventDefault()
    },
    pasteData: function(clipboard) {
      this.latPasteStatus = -1
      this.lonPasteStatus = -1

      let latRe = /([0-1]?[0-9]{2}) ?°(N|S) ([0-9]{2}) ?(?:'|‘) ?([0-9]{2})"/
      const lat = clipboard.match(latRe);
      if(lat) {
        this.current.position.lat.d = lat[1]
        this.current.position.lat.p = lat[2] === "N" ? 1 : -1
        this.current.position.lat.m = lat[3]
        this.current.position.lat.s = lat[4]
        this.latPasteStatus = 1
      }

      let lonRe = /([0-1]?[0-9]{2}) ?°(E|W) ([0-9]{2}) ?(?:'|‘) ?([0-9]{2})"/
      const lon = clipboard.match(lonRe);
      if(lon) {
        this.current.position.lng.d = lon[1]
        this.current.position.lng.p = lon[2] === "E" ? 1 : -1
        this.current.position.lng.m = lon[3]
        this.current.position.lng.s = lon[4]
        this.lonPasteStatus = 1
      }

      let headingRe = /Hdg:([0-3]?[0-9]{2})/
      const heading = clipboard.match(headingRe);
      if(heading) {
        this.current.bearing = heading[1]
        this.bearingPasteStatus = 1
      }


      let latReDash = /([0-1]?[0-9]?[0-9])°([0-9]{2})'([0-9]{2}(\.[0-9]{2})?)"(N|S)/
      const latDash = clipboard.match(latReDash);
      if(latDash) {
        this.current.position.lat.d = latDash[1]
        this.current.position.lat.p = latDash[5] === "N" ? 1 : -1
        this.current.position.lat.m = latDash[2]
        this.current.position.lat.s = latDash[3]
        this.latPasteStatus = 1
      }

      let lonReDash = /([0-1]?[0-9]?[0-9])°([0-9]{2})'([0-9]{2}(\.[0-9]{2})?)"(E|W)/
      const lonDash = clipboard.match(lonReDash);
      if(lonDash) {
        this.current.position.lng.d = lonDash[1]
        this.current.position.lng.p = lonDash[5] === "E" ? 1 : -1
        this.current.position.lng.m = lonDash[2]
        this.current.position.lng.s = lonDash[3]
        this.lonPasteStatus = 1
      }

      const it = this
      setTimeout(() => {
        it.latPasteStatus = 0
        it.lonPasteStatus = 0
        it.bearingPasteStatus = 0
      }, 30000)
      this.enablePaste = false

      return this.lonPasteStatus == 1 && this.latPasteStatus == 1
    },
    selectPoint(point) {
      this.$refs.polars.selectPoint(point)
    }
  },
  watch: {
    race: function() {
      this.load()
    },
    boat: function() {
      this.load()
    },
  }
}
</script>


<style scoped>

@media (max-height: 460px) {
  .bottom {
    visibility: hidden;
    height: 0px;
  }
}

@media (min-width: 768px) {
  .leaflet-sidebar.extended {
    top: 10px;
    bottom: 10px;
    transition: width 500ms; } }
@media (min-width: 768px) and (max-width: 991px) {
  .leaflet-sidebar.extended {
    width: 390px;
    max-width: 390px; } }
@media (min-width: 992px) and (max-width: 1199px) {
  .leaflet-sidebar.extended {
    width: 590px;
    max-width: 590px; } }
@media (min-width: 1200px) {
  .leaflet-sidebar.extended {
    width: 890px;
    max-width: 890px; } }

.leaflet-sidebar-tabs .button {
  padding: 0px;
  border: 0px;
}

.leaflet-sidebar-pane .section {
  padding-left: 0px;
  padding-top: 10px;
  padding-right: 0px;
  padding-bottom: 0px;
}

.leaflet-sidebar-pane.polars {
  padding-left: 5px;
  padding-top: 5px;
  padding-right: 0px;
  padding-bottom: 0px;
}
</style>
