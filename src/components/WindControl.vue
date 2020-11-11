<template>
  <div class="leaflet-control-layers leaflet-control forecast-times">
    <div class="stamp" @click="colapsed = !colapsed">{{ maxStamp.slice(-2) }}h {{ Math.round(progress * 100 / (forecasts.length - 2)) }}%</div>
    <div v-show="!colapsed" v-for="forecast in forecasts" :key="forecast.hour" v-bind:class="{ last: forecast.stamp == lastStamp, selected: forecast.forecast == selectedForecast }">
      <div @click="loadWind(forecast.forecast, 0)">
        <div class="days"><span v-if="forecast.hour >= 24 && forecast.hour % 24 < 3">{{ Math.floor(forecast.hour/24) }}j</span></div>
        <div class="hours">{{ forecast.hour%24 }}h</div>
      </div>
      <div v-if="debug && forecast.stamp2 != ''" @click="loadWind(forecast.forecast, 1)">
        <div class="days">#</div>
        <div class="hours">{{ forecast.hour%24 }}h</div>
      </div>
      <span class="forecast-date"></span>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet-velocity'
const moment = require('moment');

export default {
  name: 'WindControl',
  props: {
    map: Object,
    debug: Boolean
  },
  data: function () {

    var now = new Date()
    now.setHours(now.getHours() - 1)

    return {
      velocityLayer: null,
      forecasts: [
      ],
      forecastsData: {},
      selectedForecast: "",
      lastStamp: now.getUTCFullYear() + ("00" + (now.getUTCMonth() + 1)).slice(-2) + ("00" + now.getUTCDate()).slice(-2) + ("00" + (now.getUTCHours() - now.getUTCHours()%6)).slice(-2),
      maxStamp: "",
      progress: 0,
      colapsed: true
    }
  },
  mounted: function() {
    const it = this
    this.velocityLayer = L.velocityLayer({
            displayValues: true,
            displayOptions: {
                    velocityType: 'Global Wind',
                    position: 'bottomleft',
                    displayPosition: 'bottomleft',
                    displayEmptyString: 'No wind data',
                    angleConvention: 'meteoCW',
                    speedUnit: 'kt'
            },
            maxVelocity: 15
    }).addTo(this.map);

    this.$http.get('/winds').then(response => {
      this.forecasts = response.body
      this.forecasts.sort((a, b) => a.hour - b.hour)
      this.loadWind(this.forecasts[0].forecast, 0)
      for(var i = 2 ; i < this.forecasts.length ; i++) {
        var forecast = this.forecasts[i]
        if (forecast.stamp > it.maxStamp) {
          it.maxStamp = forecast.stamp
          it.progress = 1
        } else if (forecast.stamp == it.maxStamp) {
          it.progress++
        }
      }

    }, () => {
      console.log("Error loading winds")
    });
  },
  methods: {
    loadWind: function(forecast, stamp) {

      if(this.forecastsData[forecast + (stamp != undefined ? "-" + stamp : "")]) {
        this.velocityLayer.setData(this.forecastsData[forecast + (stamp ? "-" + stamp : "")])
        this.selectedForecast = forecast
      } else {
        this.$http.get('/winds/'+forecast + (stamp != undefined ? "/" + stamp : "")).then(response => {
          this.forecastsData[forecast] = response.body
          this.velocityLayer.setData(response.body)
          this.selectedForecast = forecast
        }, () => {
          console.log("Error loading winds")
        })
      }
    },
    findWinds: function(now) {
      const stamp = now.format("YYYYMMDDHH")

      var keys = []
      for(var i in this.forecasts) {
        keys.push(this.forecasts[i].forecast)
      }
      keys.sort()
      if (keys[0] > stamp) {
        return [this.getWind(keys[0]), null, 0]
      }
      for (i in keys) {
        if (keys[i] > stamp) {
          const m_i_1 = moment(keys[i-1], "YYYYMMDDHH")
          const m_i = moment(keys[i], "YYYYMMDDHH")
          const h = moment.duration(now.diff(m_i_1)).asMinutes();
          const delta = moment.duration(m_i.diff(m_i_1)).asMinutes();
          return [this.getWind(keys[i-1]), this.getWind(keys[i]), h / delta]
        }
      }
      return [this.getWind(keys[length(keys)-1]), null, 0]

    },
    getWind: function(w) {
      for (var i in this.forecastsData[w]) {
        const h = this.forecastsData[w][i].header
        if(h.discipline == 0 && h.parameterCategory == 2) {
          const w = {
            Lat0: h.La1 / 1e6,
            Lon0: h.Lo1 / 1e6,
            ΔLat: h.Di / 1e6,
            ΔLon: h.Dj / 1e6,
            NLat: h.Nj,
            NLon: h.Ni
          }
          if(this.forecastsData[w][i].header.parameterNumber == 2)
            w.U = this.forecastsData[w][i].data
          else if(this.forecastsData[w][i].header.parameterNumber == 3)
            w.V = this.forecastsData[w][i].data
        }
      }
      return w
    },
    bilinearInterpolate: function(x, y, g00, g10, g01, g11) {
      const rx = (1 - x)
      const ry = (1 - y)

      const a = rx * ry
      const b = x * ry
      const c = rx * y
      const d = x * y

      const u = g00[0]*a + g10[0]*b + g01[0]*c + g11[0]*d
      const v = g00[1]*a + g10[1]*b + g01[1]*c + g11[1]*d

      return [u, v, Math.sqrt(u*u + v*v)]
    },
    floorMod: function(a, n) {
      return a - n*Math.floor(a/n)
    },
    locInterpolate: function(w, lat, lon) {
      const i = Math.abs((lat - w.Lat0) / w.ΔLat)
      const j = this.floorMod(lon-w.Lon0, 360.0) / w.ΔLon

      const fi = Math.floor(i)
      const fj = Math.floor(j)

      const u00 = w.U[fi][fj]
      const v00 = w.V[fi][fj]

      const u01 = w.U[fi+1][fj]
      const v01 = w.V[fi+1][fj]

      const u10 = w.U[fi][fj+1]
      const v10 = w.V[fi][fj+1]

      const u11 = w.U[fi+1][fj+1]
      const v11 = w.V[fi+1][fj+1]

      return this.bilinearInterpolate(j-fj, i-fi, [u00, v00], [u10, v10], [u01, v01], [u11, v11])
    },
    vectorToDegrees: function(u, v, d) {
      const velocityDir = Math.atan2(u/d, v/d)
      const velocityDirToDegrees = velocityDir*180/Math.PI + 180
      return velocityDirToDegrees
    },
    interpolate: function(w, w1, lat, lon, h) {
      const uvd = this.interpolate(w, lat, lon)
      var u = uvd[0]
      var v = uvd[1]
      var d = uvd[2]

      if (w1) {
        const uvd1 = this.interpolate(w1, lat, lon)
        const u1 = uvd1[0]
        const v1 = uvd1[1]

        u = u1*h + u*(1-h)
        v = v1*h + v*(1-h)
        d = Math.sqrt(u*u + v*v)
      }

      return [this.vectorToDegrees(u, v, d), d]
    }
  }
}
</script>

<style>
div.leaflet-top.leaflet-right {
    height: 100%;
    display: flex;
    flex-flow: column;
}
div.leaflet-control-layers.leaflet-control.forecast-times.expanded {
}
div.leaflet-control-layers.leaflet-control.forecast-times.colapsed {
    height: 120px;
}
</style>

<style scoped>

div.leaflet-control-layers.leaflet-control.forecast-times {
    overflow-y: scroll;
    margin-bottom: 10px;
    -webkit-overflow-scrolling: touch;
    z-index: 25;
}

.stamp {
    text-align: center;
}

.days {
    display: inline-block;
    width: 25px;
    text-align: center;
}

.hours {
    display: inline-block;
    width: 35px;
    text-align: center;
}

.last {
  background-color: #bee5c1;
}

.selected {
    color: #fff;
    background-color: #3388ff;
    opacity: 0.5;
}
</style>
