<template>
  <div class="leaflet-control-layers leaflet-control forecast-times">
    <div v-for="forecast in forecasts" :key="forecast.hour" id="" v-bind:class="{ last: forecast.stamp == lastStamp, selected: forecast.forecast == selectedForecast }" @click="loadWind(forecast.forecast)">
      <div class="days"><span v-if="forecast.hour > 24 && forecast.hour % 24 < 3">{{ Math.floor(forecast.hour/24) }}j</span></div>
      <div class="hours">{{ forecast.hour%24 }}h</div>
      <span class="forecast-date"></span>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet-velocity'

export default {
  name: 'WindControl',
  props: {
    map: Object
  },
  data: function () {

    var now = new Date()

    return {
      velocityLayer: null,
      forecasts: [
      ],
      forecastsData: {},
      selectedForecast: "",
      lastStamp: now.getUTCFullYear() + ("00" + (now.getUTCMonth() + 1)).slice(-2) + ("00" + now.getUTCDate()).slice(-2) + ("00" + (now.getUTCHours() - now.getUTCHours()%6)).slice(-2)
    }
  },
  mounted: function() {
    this.velocityLayer = L.velocityLayer({
            displayValues: true,
            displayOptions: {
                    velocityType: 'Global Wind',
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
      this.loadWind(this.forecasts[0].forecast)

    }, () => {
      console.log("Error loading winds")
    });
  },
  methods: {
    loadWind: function(forecast) {

      if(this.forecastsData[forecast]) {
        this.velocityLayer.setData(this.forecastsData[forecast])
        this.selectedForecast = forecast
      } else {
        this.$http.get('/winds/'+forecast).then(response => {
          this.forecastsData[forecast] = response.body
          this.velocityLayer.setData(response.body)
          this.selectedForecast = forecast
        }, () => {
          console.log("Error loading winds")
        })
      }
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
</style>

<style scoped>

div.leaflet-control-layers.leaflet-control.forecast-times {
    overflow-y: scroll;
    margin-bottom: 10px;
    -webkit-overflow-scrolling: touch;
    z-index: 25;
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
