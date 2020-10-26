<template>
  <div style="overflow-x:scroll;">
    <table class="table is-fullwidth">
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th><i class='fa fa-compass'></i></th>
          <th><i class='fa fa-location-arrow'></i></th>
          <th></th>
        </tr>
      </thead>
      <tr v-for="(l, index) in lines" :key="index">
        <td><span style="white-space: nowrap;">{{ l.timeshift }}</span></td>
        <td>{{ l.date }}</td>
        <td>{{ l.bearing }}°</td>
        <td>{{ l.twa }}°</td>
        <td>{{ l.sail }}</td>
        <td><span v-if="l.foil > 0" class='foil' v-bind:style="{opacity: l.foil + '%'}"><i class='fa fa-fighter-jet'></i></span></td>
        <td><span style="white-space: nowrap;"><i class='fa fa-wind'></i> {{ l.wind }}° {{ l.windSpeed.toFixed(1) }} kt</span> <span style="white-space: nowrap;"><i class='fa fa-ship'></i> {{ l.boatSpeed.toFixed(1) }} kt</span></td>
      </tr>
    </table>
  </div>
</template>

<script>
import {EventBus} from '../event-bus.js';

export default {
  name: 'Table',
  props: {
  },
  data: function() {
    return {
      route: {
        windline: []
      }
    }
  },
  mounted: function() {
    EventBus.$on('route', this.onRoute)
  },
  computed: {
    lines: function() {
      const res = []
      this.route.windline.forEach(wl => {
        const sails = ["Jib", "Spi", "Stay", "LJ", "C0", "HG", "LG"];

        var date = new Date(this.route.date.getTime())
        date.setMinutes(date.getMinutes() + wl.duration * 60);

        const delta = Math.abs(date - new Date()) / 36e5;

        var j = Math.floor(delta / 24)
        var h = Math.floor(delta % 24)
        var m = Math.round(60 * (delta - j * 24 - h))
        if (m == 60) {
          m = 0
          h ++
        }
        if (h == 24) {
          h = 0
          j ++
        }

        var d = date > new Date()?"+":"-"
        if(j > 0) {
          d += j + "j"
        }
        if(h > 0) {
//          if(d.length > 0) d += " "
          d += h + "h"
        }
        if(m > 0) {
//          if(d.length > 0) d += " "
          d += m + "m"
        }

        var hrs = date.getHours();
        var min = date.getMinutes();
        if (min < 10) {
          min = "0" + min;
        }

        res.unshift({
          timeshift: d,
          date: hrs + ":" + min,
          bearing: wl.bearing,
          twa: wl.twa,
          sail: sails[wl.sail],
          foil: wl.foil,
          wind: wl.wind,
          windSpeed: wl.windSpeed,
          boatSpeed: wl.boatSpeed
        })
      })
      return res
    }
  },
  methods: {
    onRoute(route) {
      this.route = route




//      var primary = "<i class='fa fa-compass'></i> " + wl.bearing + "° <i class='fa fa-location-arrow'></i> " + wl.twa + "° <span class='sail'>" + sails[wl.sail] + "</span>";
//      if(wl.foil > 0) {
        //primary += "<span class='foil' style='color:rgb(255," + 255 * (wl.foil / 100) + "," + 255 * (wl.foil / 100) + ");'><i class='fa fa-fighter-jet'></i></span>"
//        primary += "<span class='foil' style='opacity:" + (wl.foil) + "%;'><i class='fa fa-fighter-jet'></i></span>"
//      }
//      if(wl.ice) {
//        primary += "<span class='ice'><i class='fas fa-igloo'></i></span>"
//      }
//      const secondary = "<i class='fa fa-wind'></i> " + wl.wind + "° " + wl.windSpeed.toFixed(1) + "kt <i class='fa fa-ship'></i> " + wl.boatSpeed.toFixed(1) + "kt";

//      var res = '<div class="date"><span>' + d + '</span><span class="hour">' + hrs + ":" + min + '</span></div><div class="primary">' + primary + '</div>';
//      if(secondary)
//          res += '<div class="secondary">' + secondary + '</div>';

//      return res;
    }
  }
}
</script>

<style scoped>
</style>
