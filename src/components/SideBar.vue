<template>
  <div id="sidebar" class="leaflet-sidebar collapsed">
    <!-- Nav tabs -->
    <div class="leaflet-sidebar-tabs">
      <ul role="tablist"> <!-- top aligned tabs -->
        <li><a href="#home" role="tab" @click="display('home')"><i class="fa fa-bars"></i></a></li>
        <li><a role="tab" @click="center"><i class="fa fa-dot-circle"></i></a></li>
        <li><a role="tab" @click="pan"><i class="fa fa-expand"></i></a></li>
        <li><a role="tab" @click="showTooltip" class="button is-white"><i class="fa fa-eye"></i></a></li>
        <li><a role="tab" @click="enablePaste = !enablePaste"><i class="fa fa-paste"></i></a></li>
        <li><a role="tab" @click="run" class="button is-white" v-bind:class="{ 'is-loading': loading }">GO</a></li>
      </ul>

      <ul role="tablist"> <!-- bottom aligned tabs -->
        <li><a href="#table" role="tab" @click="display('table')"><i class="fa fa-table"></i></a></li>
        <li><a href="#polars" role="tab" @click="display('polars')"><i class="fas fa-chart-area"></i></a></li>
        <li><a href="#buoys" role="tab" @click="display('buoys')"><i class="fas fa-map-marked"></i></a></li>
        <li><a href="#boats" role="tab" @click="display('boats')"><i class="fa fa-ship"></i></a></li>
        <li v-if="debug"><a href="#settings" role="tab" @click="display('settings')"><i class="fas fa-cog"></i></a></li>
      </ul>
    </div>

    <!-- Tab panes -->
    <div class="leaflet-sidebar-content">
      <div class="leaflet-sidebar-pane" id="home">
        <h1 class="leaflet-sidebar-header">
          Current Race
          <div class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></div>
        </h1>
        <section class="section">
          <label class="label">Race</label>
          <div class="field is-grouped">
            <div class="control has-icons-left">
              <div class="select is-small">
                <select v-model="current.id" @change="selectRace(current.id, true)">
                  <option v-for="(race, id) in races" :key="id" v-bind:value="id">
                    {{ race.name }}
                  </option>
                </select>
              </div>
              <span class="icon is-left">
                <i class="fa fa-globe"></i>
              </span>
            </div>
            <p class="control">
              <a class="button is-small" v-bind:class="{'is-loading': polarsLoading}" @click="refreshPolars"><i class="fa fa-kiwi-bird"></i></a>
            </p>
          </div>
          <div class="field is-grouped">
            <div class="field">
              <label class="label">Cap</label>
              <div class="field has-addons">
                <p class="control">
                  <input v-model.number="current.bearing" class="input is-small" type="text" placeholder="41" style="width:60px">
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
          <div v-if="enablePaste" class="field is-grouped">
            <p class="control">
              <input v-model="pasteLatlon" @paste="paste" class="input is-small" type="text">
            </p>
          </div>
          <label class="label">Latitude</label>
          <div class="field is-grouped">
            <div class="field has-addons">
              <p class="control">
                <input v-model.number="current.position.lat.d" class="input is-small" type="text" placeholder="41" style="width:60px">
              </p>
              <p class="control">
                <a class="button is-static is-small">°</a>
              </p>
              <p class="control">
                <span class="select is-small">
                  <select v-model="current.position.lat.p" style="width:60px">
                    <option value="1">N</option>
                    <option value="-1">S</option>
                  </select>
                </span>
              </p>
              <p class="control">
                <input v-model.number="current.position.lat.m" class="input is-small" type="text" placeholder="42" style="width:60px">
              </p>
              <p class="control">
                <a class="button is-static is-small">'</a>
              </p>
              <p class="control">
                <input v-model.number="current.position.lat.s" class="input is-small" type="text" placeholder="43" style="width:60px">
              </p>
              <p class="control">
                <a class="button is-static is-small">''</a>
              </p>
            </div>
          </div>
          <label class="label">Longitude</label>
          <div class="field is-grouped">
            <div class="field has-addons">
              <p class="control">
                <input v-model.number="current.position.lng.d" class="input is-small" type="text" placeholder="41" style="width:60px">
              </p>
              <p class="control">
                <a class="button is-static is-small">°</a>
              </p>
              <p class="control">
                <span class="select is-small">
                  <select v-model.number="current.position.lng.p" style="width:60px">
                    <option value="1">E</option>
                    <option value="-1">W</option>
                  </select>
                </span>
              </p>
              <p class="control">
                <input v-model.number="current.position.lng.m" class="input is-small" type="text" placeholder="42" style="width:60px">
              </p>
              <p class="control">
                <a class="button is-static is-small">'</a>
              </p>
              <p class="control">
                <input v-model.number="current.position.lng.s" class="input is-small" type="text" placeholder="43" style="width:60px">
              </p>
              <p class="control">
                <a class="button is-static is-small">''</a>
              </p>
            </div>
          </div>
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
            <input v-model.number="current.delta" class="input is-small" type="text" placeholder="3" style="width:60px">
            <span class="icon is-left">
              <i class="fas fa-expand-alt"></i>
            </span>
          </p>
          <p class="control has-icons-left">
            <input v-model.number="current.delay" class="input is-small" type="text" placeholder="0" style="width:60px">
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
        <Table v-bind:display="displayed === 'table'"></Table>
      </div>
      <div class="leaflet-sidebar-pane" id="boats">
        <Boats></Boats>
      </div>
      <div class="leaflet-sidebar-pane polars" id="polars">
        <Polar ref="polars" v-bind:races="races" v-bind:current="current"></Polar>
      </div>
      <div class="leaflet-sidebar-pane" id="buoys">
        <Buoys v-bind:races="races" v-bind:current="current"></Buoys>
      </div>
      <div class="leaflet-sidebar-pane" id="settings">
        <Expes v-bind:debug="debug"></Expes>
      </div>
    </div>
  </div>
</template>


<script>
import L from 'leaflet'
import 'leaflet-sidebar-v2'
import Polar from './Polar.vue'
import Buoys from './Buoys.vue'
import Expes from './Expes.vue'
import Boats from './Boats.vue'
import Table from './Table.vue'

export default {
  name: 'SideBar',
  props: {
    boat: String,
    map: Object,
    races: Object,
    position: Object,
    loading: Boolean,
    debug: Boolean
  },
  components: {
    Polar,
    Buoys,
    Boats,
    Table,
    Expes
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
      displayed: null
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
        console.log(this.current.sails)
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
        console.log(this.current.sails)
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
        console.log(this.current.sails)
      }
    },
  },
  mounted: function() {
    const it = this

    //this.handlePermission()

    this.sidebar = L.control.sidebar({
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
        container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
    }).addTo(this.map);
    this.sidebar.on('content', function(e) {
      if(e.id == "polars") {
        setTimeout(it.$refs.polars.onResize, 500)
        it.sidebar.off('content')
      }
    })
  },
  methods: {
    display: function(tab) {
      if(this.displayed === tab) {
        this.displayed = null
      } else {
        this.displayed = tab
      }
    },
    convertDMSToDD: function(p, d, m, s) {
      return Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600);
    },
    convertDDToDMS: function(D){
      return {
        p : D<0?-1:1,
        d : 0|(D<0?D=-D:D),
        m : 0|D%1*60,
        s :(0|D*60%1*6000)/100
      };
    },
    selectRace: function(race, pan) {
      try {
        var current = JSON.parse(localStorage.getItem((this.boat ? this.boat + "_" : "") + race))
        if(current) {
          this.current = current
        } else {
          this.current = {
            id: race,
            bearing: 180,
            sail: 0,
            position: {
              lat: this.convertDDToDMS(this.races[race].start.lat),
              lng: this.convertDDToDMS(this.races[race].start.lon)
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

        localStorage.setItem('current_race', this.current.id)

        if(pan) this.pan()
        this.$nextTick(() => {
          this.$emit('configure', this.current)
        });
      } catch(e) {
        console.log(e)
      }
    },
    submit: function() {
      this.sidebar.close();
      this.display = null

      localStorage.setItem((this.boat ? this.boat + "_" : "") + this.current.id, JSON.stringify(this.current))

      this.$emit('configure', this.current)
    },
    center: function() {
      var pan = [
        this.convertDMSToDD(this.current.position.lat.p, this.current.position.lat.d, this.current.position.lat.m, this.current.position.lat.s),
        this.convertDMSToDD(this.current.position.lng.p, this.current.position.lng.d, this.current.position.lng.m, this.current.position.lng.s)]
      this.map.flyTo(pan, 11)
    },
    pan: function() {
      if(this.current) {
        var min_lat = this.races[this.current.id].start.lat
        var max_lat = this.races[this.current.id].start.lat
        var min_lon = this.races[this.current.id].start.lon
        var max_lon = this.races[this.current.id].start.lon

        // if(this.current.last) {
        //   for(var w in this.current.last) {
        //     var wl = this.current.last[w];
        //     min_lat = min_lat < wl.lat ? min_lat : wl.lat
        //     max_lat = max_lat > wl.lat ? max_lat : wl.lat
        //     min_lon = min_lon < wl.lon ? min_lon : wl.lon
        //     max_lon = max_lon > wl.lon ? max_lon : wl.lon
        //   }
        // }
        for(var d in this.races[this.current.id].waypoints) {
          var door = this.races[this.current.id].waypoints[d];
          for(var ll in door.latlons) {
            var w = door.wrap ? door.wrap * 360 : 0
            var latlon = door.latlons[ll]
            min_lat = min_lat < latlon.lat ? min_lat : latlon.lat
            max_lat = max_lat > latlon.lat ? max_lat : latlon.lat
            min_lon = min_lon < latlon.lon + w ? min_lon : latlon.lon + w
            max_lon = max_lon > latlon.lon + w ? max_lon : latlon.lon + w
            console.log(min_lat, min_lon, max_lat, max_lon, latlon, w)
          }
        }
        this.map.flyToBounds([[min_lat, min_lon], [max_lat, max_lon]])
      }
    },
    run: function() {
      this.submit()
      this.$emit('run')
    },
    showTooltip: function() {
      this.$emit('show-tooltip')
    },
    refreshPolars: function() {
      this.polarsLoading = true
      this.$http.get('/polars/' + this.races[this.current.id].polars).then(() => {
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
    /*handlePermission: function() {
      navigator.permissions.query({name:'clipboardRead'}).then(function(result) {
        if (result.state == 'granted') {
          this.enablePaste = true
        } else if (result.state == 'prompt') {
          this.enablePaste = true
        } else if (result.state == 'denied') {
          this.enablePaste = false
        }
        result.onchange = function() {
          console.log(result.state);
        }
      });
    },*/
    paste: function(event) {
      var clipboard = event.clipboardData.getData("text/plain")

      let latRe = /(0?[0-9]{2})°(N|S) ([0-9]{2})(?:'|‘) ?([0-9]{2})"/
      const lat = clipboard.match(latRe);
      if(lat) {
        this.current.position.lat.d = lat[1]
        this.current.position.lat.p = lat[2] === "N" ? 1 : -1
        this.current.position.lat.m = lat[3]
        this.current.position.lat.s = lat[4]
      }

      let lonRe = /(0?[0-9]{2})°(E|W) ([0-9]{2})(?:'|‘) ?([0-9]{2})"/
      const lon = clipboard.match(lonRe);
      if(lon) {
        this.current.position.lng.d = lon[1]
        this.current.position.lng.p = lon[2] === "E" ? 1 : -1
        this.current.position.lng.m = lon[3]
        this.current.position.lng.s = lon[4]
      }

      let latReDash = /(0?[0-9]{2})°([0-9]{2})'([0-9]{2})"(N|S)/
      const latDash = clipboard.match(latReDash);
      if(latDash) {
        this.current.position.lat.d = latDash[1]
        this.current.position.lat.p = latDash[4] === "N" ? 1 : -1
        this.current.position.lat.m = latDash[2]
        this.current.position.lat.s = latDash[3]
      }

      let lonReDash = /(0?[0-9]{2})°([0-9]{2})'([0-9]{2})"(E|W)/
      const lonDash = clipboard.match(lonReDash);
      if(lonDash) {
        this.current.position.lng.d = lonDash[1]
        this.current.position.lng.p = lonDash[4] === "E" ? 1 : -1
        this.current.position.lng.m = lonDash[2]
        this.current.position.lng.s = lonDash[3]
      }

      event.preventDefault()
      this.enablePaste = false
    },
    selectPoint(point) {
      this.$refs.polars.selectPoint(point)
    }
  },
  watch: {
    races: function() {
      var race = localStorage.getItem('current_race')
      this.selectRace(race, false)
    },
    position: function() {
      this.current.position = this.position
      localStorage.setItem((this.boat ? this.boat + "_" : "") + this.current.id, JSON.stringify(this.current))
    },
  }
}
</script>


<style scoped>
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
