module.exports = {
  devServer: {
    proxy: {
      '^/route|^/debug': {
        //target: 'http://localhost:8888'
        target: 'https://route.phtheirichthys.fr'
      },
      '^/winds': {
        // target: 'http://localhost:8090'
        target: 'https://route.phtheirichthys.fr'
      },
      '^/2021122212.f060': {
        // target: 'http://localhost:8090'
        target: 'https://winds.auth-573148094ea14d80b91faa8907f84ee2.storage.gra.cloud.ovh.net'
      },
      '^/polars': {
        // target: 'http://localhost:7777'
        target: 'https://route.phtheirichthys.fr'
      },
      '^/races': {
        // target: 'http://localhost:7777'
        target: 'https://route.phtheirichthys.fr'
      },
      '^/api': {
        changeOrigin: true,
        // target: 'http://localhost:7777'
        target: 'https://route.phtheirichthys.fr'
      }
    }
    //proxy: 'https://route.phtheirichthys.fr'
  }
}
