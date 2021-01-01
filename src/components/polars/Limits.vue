<template>
  <svg id="limits" :width="width" :height="height">
    <g id="degrees"></g>
    <g id="speed"></g>
    <g id="path"></g>
  </svg>
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'Limits',
  props: {
    margin: {
      type: Object,
      default: () => ({
        left: 0,
        right: 0,
        top: 10,
        bottom: 10,
      }),
    },
    races: Object,
    current: Object,
  },
  data: function() {
    return {
      focus: undefined,
      width: 0,
      height: 0
    }
  },
  mounted: function() {
    window.addEventListener('resize', this.onResize);
    this.onResize()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
  },
  watch: {
    width: function widthChanged() {
      this.update()
    },
    current: {
      deep: true,
      handler(newCurrent, oldCurrent) {
        if(!this.races || (oldCurrent &&  newCurrent.id == oldCurrent.id)) {
          return
        }
        this.load(this.races[this.current.id].boat)
      }
    },
    races: function () {
      if(!this.current) {
        return
      }
      this.load(this.races[this.current.id].boat)
    },
  },
  methods: {
    load: function(boat) {
      this.$http.get('polars/api/v1/boats/' + boat + '/sails').then(response => {
        this.limits = response.body
        this.onResize()
      }, () => {
        console.log("Error loading polars")
      })
    },
    onResize() {
      this.width = this.$el.parentElement.parentElement.parentElement.clientWidth - 10
      this.height = this.$el.parentElement.parentElement.parentElement.clientHeight - 80
      this.update()
    },
    select: function(sail) {
      if (this.focus === sail)
        this.focus = undefined
      else
        this.focus = sail

      this.update()
    },
    update() {
      if(!this.limits) {
        return
      }

      this.drawAxis()

      d3.select('#limits').select("#path").selectAll("*").remove()

      this.limits.forEach(sail => {
        if (this.focus && sail.id === this.focus)
          return
        this.drawSail(sail, this.focus)
      })

      if (this.focus)
        this.limits.forEach(sail => {
          if (this.focus && sail.id !== this.focus)
            return
          this.drawSail(sail, this.focus)
        })

    },
    drawAxis() {
      const size = Math.min(this.height / 2 - 50, this.width - 80)

      const degrees = d3.select("#limits").select("#degrees")
      degrees.selectAll("*").remove()
      degrees.append("line")
        .attr("transform", "translate(25," + this.height / 2 + ") rotate(" + 0 + ")")
        .style("stroke", "grey")
        .style("stroke-width", 0.33)
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", -size - 5)

      for(var a = 0 ; a <= 180 ; a += 20) {
        degrees.append("text")
          .attr("transform", "translate(0," + Math.round(this.height / 2 - (a * size / 180) + 2) + ")")
          .text(a + "°")
          .attr("font-size", "12px")
          .attr("fill", "grey")
      }

      const speed = d3.select("#limits").select("#speed")
      speed.selectAll("*").remove()
      speed.append("line")
        .attr("transform", "translate(25," + this.height / 2 + ") rotate(" + 0 + ")")
        .style("stroke", "grey")
        .style("stroke-width", 0.33)
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", size + 5)
        .attr("y2", 0)

      for(var s = 0 ; s <= 70 ; s += 10) {
        speed.append("text")
          .attr("transform", "translate(" + Math.round(s * size / 70 - -25) + ", " + Math.round(this.height / 2 - -15) + ")")
          .text(s + "kt")
          .attr("font-size", "12px")
          .attr("fill", "grey")
      }

    },
    drawSail: function(sail, focus) {

      const colors = {
        1: "#ff9999", // jib
        2: "#9999ff", // Spi
        3: "#99ff99", // staysail
        4: "#ffff99", // lightjib
        5: "#99ddff", // code0
        6: "#ff99ff", // heavygnk
        7: "#ffdd99", // lightgnk
      }

      const size = Math.min(this.height / 2 - 50, this.width - 80)

      var max = []
      var min = []
      var lineGenerator = d3.line();

      if (focus && focus === sail.id) {
        for (let [ws, value] of Object.entries(sail.twa)) {
          if (value.max.autoSailChange) {
            max.push([ws * size / 70, this.height / 2 - value.max.autoSailChange * size / 180])
          }
          if (value.min.autoSailChange) {
            min.push([ws * size / 70, this.height / 2 - value.min.autoSailChange * size / 180])
          }
        }
        min.reverse()

        var autoSailChangePathString = lineGenerator(max.concat(min));
        d3.select('#limits').select('#path').append("path")
          // .attr("transform", "translate(25," + this.height / 2 + ")")
          .attr("transform", "translate(25, 0)")
          .attr('d', autoSailChangePathString)
          .style("stroke", colors[sail.id])
          .style("stroke-width", 1)
          .style("fill", colors[sail.id])
          .style("opacity", "0.7")
      }

      max = []
      min = []
      for (let [ws, value] of Object.entries(sail.twa)) {
        if (value.max.best) {
          max.push([ws * size / 70, this.height / 2 - value.max.best * size / 180])
        }
        if (value.min.best) {
          min.push([ws * size / 70, this.height / 2 - value.min.best * size / 180])
        }
      }
      min.reverse()

      const id = sail.id
      const it = this

      var pathString = lineGenerator(max.concat(min));
      var path = d3.select('#limits').select('#path').append("path")
        // .attr("transform", "translate(25," + this.height / 2 + ")")
        .attr("transform", "translate(25, 0)")
        .attr('d', pathString)
        .style("stroke", colors[sail.id])
        .style("stroke-width", 1)
        .style("fill", colors[sail.id])
        .on("click", function() {
          it.select(id)
        })
      if (focus && focus !== sail.id) {
        path.style("opacity", "0.2")
      }

      // const min = []
      // for (let [ws, value] of Object.entries(sail.twa)) {
      //   if (value.min.best) {
      //     min.push([ws * size / 70, this.height / 2 - value.min.best * size / 180])
      //   }
      // }
      //
      // pathString = lineGenerator(min);
      // d3.select('#limits').select('#path').append("path")
      //   // .attr("transform", "translate(25," + this.height / 2 + ")")
      //   .attr("transform", "translate(25, 0)")
      //   .attr('d', pathString)
      //   .style("stroke", colors[sail.id])
      //   .style("stroke-width", 1)
      //   .style("fill", "none")

      const minAutoSailChange = []
      for (let [ws, value] of Object.entries(sail.twa)) {
        if (value.min.autoSailChange) {
          minAutoSailChange.push([ws * size / 70, this.height / 2 - value.min.autoSailChange * size / 180])
        }
      }

      // pathString = lineGenerator(minAutoSailChange);
      // d3.select('#limits').select('#path').append("path")
      //   // .attr("transform", "translate(25," + this.height / 2 + ")")
      //   .attr('d', pathString)
      //   .style("stroke", colors[sail.id])
      //   .style("stroke-width", 1)
      //   .style("fill", "none")

    }
  }
}
</script>

<style scoped>

</style>
