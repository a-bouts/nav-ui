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
          <input class="is-checkradio is-info" id="route-last-update" type="checkbox" name="route-last-update" v-model="settings.routeLastUpdate" >
          <label for="route-last-update">Route depuis la dernière position (pas la simulation)</label>
        </div>
        <div class="field">
          <input class="is-checkradio is-info" id="wind-has-background-color" type="checkbox" name="wind-has-background-color" v-model="settings.windHasBackgroundColor" >
          <label for="wind-has-background-color">Vents sur fond coloré par défaut</label>
        </div>
        <div class="field">
          <input class="is-checkradio is-info" id="wind-disabled" type="checkbox" name="wind-disabled" v-model="settings.windDisabled" >
          <label for="wind-disabled">Vent désactivé par defaut</label>
        </div>
        <label class="label">Horaires de nuit</label>
        <div class="field is-grouped">
          <p class="control has-icons-left">
            <input class="input is-small" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="hh:mm" title="hh:mm" style="width:80px" v-model="settings.sunset" >
            <span class="icon is-left">
              <i class="fas fa-moon"></i>
            </span>
          </p>
          <p class="control has-icons-left">
            <input class="input is-small" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="hh:mm" title="hh:mm" style="width:80px" v-model="settings.dawn" >
            <span class="icon is-left">
              <i class="fas fa-sun"></i>
            </span>
          </p>
        </div>
        <label class="label">Durée du serpent</label>
        <div class="field is-grouped">
          <p class="control has-icons-left">
            <input class="input is-small" type="text" pattern="[0-9]{2}" placeholder="24" title="hours" style="width:80px" v-model.number="settings.snakeDuration" >
          </p>
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
import dataService from '../lib/data.js';
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
    var settings = dataService.getSettings()
    if (settings) {
      this.settings = settings
    }
    this.expes = dataService.getExpes()
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
      dataService.saveExpes(this.expes)
      if (this.debug) {
        EventBus.$emit('expes', this.expes)
      }
    },
    saveSettings() {
      dataService.saveSettings(this.settings)
      EventBus.$emit('settings', this.settings)
    }
  }
}
</script>

<style scoped>
</style>
