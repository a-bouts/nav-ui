<template>
  <div class="card">
    <div class="card-content">
      <div class="media">
        <div class="media-content">
          <p class="title is-4">Settings</p>
        </div>
      </div>
      <div class="content">
        <div class="field">
          <input class="is-checkradio is-info" id="wind-has-background-color" type="checkbox" name="wind-has-background-color" v-model="settings.windHasBackgroundColor" >
          <label for="wind-has-background-color">Vents sur fond coloré par défaut</label>
        </div>
      </div>
    </div>

    <div v-if="debug" class="card-content">
      <div class="media">
        <div class="media-content">
          <p class="title is-4">Experiments</p>
        </div>
      </div>
      <div class="content">
        <div class="field" v-for="(value, expe) in expes" :key="expe">
          <input class="is-checkradio is-danger" :id="expe" type="checkbox" :name="expe" :checked="value" @change="save(expe, !value)" >
          <label :for="expe">{{ expe }}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {EventBus} from '../event-bus.js';

export default {
  name: 'Expes',
  props: {
    debug: Boolean,
    priv: Boolean
  },
  data: function() {
    return {
      settings: {
      },
      expes: {}
    }
  },
  watch: {
    settings: {
      deep: true,
      handler() {
        this.saveSettings()
      }
    }
  },
  mounted: function() {
    const it = this
    var settings = JSON.parse(localStorage.getItem("_settings_"))
    if (settings) {
      this.settings = settings
    }
    this.expes = JSON.parse(localStorage.getItem("_expes_"))
    var url = '/debug/nav/expes'
    if (this.priv) {
      url = '/private/nav/expes'
    }
    this.$http.get(url).then(response => {
      const expes = {}
      response.body.forEach(expe => {
        expes[expe] = false
        if (it.expes && it.expes[expe])
          expes[expe] = true
      });
      it.expes = expes
      if (it.debug) {
        EventBus.$emit('expes', it.expes)
      }
    })
  },
  methods: {
    save(expe, value) {
      this.expes[expe] = value
      localStorage.setItem("_expes_", JSON.stringify(this.expes))
      if (this.debug) {
        EventBus.$emit('expes', this.expes)
      }
    },
    saveSettings() {
      localStorage.setItem("_settings_", JSON.stringify(this.settings))
      EventBus.$emit('settings', this.settings)
    }
  }
}
</script>

<style scoped>
</style>
