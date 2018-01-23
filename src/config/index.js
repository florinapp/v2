let envConfig = null;

const DEFAULT_CONFIG = {
  basename: "/",
  dbname: "florin",
  dbdebug: false
};

const currentEnv = process.env.NODE_ENV;

const envConfigs = {
  "test": {
    dbname: "florin-test",
    dbadapter: "memory"
  },
  "development": {
    dbname: "florin-test"
  },
  "production": {
    basename: "/demo",
  }
}

const config = Object.assign({}, DEFAULT_CONFIG, envConfigs[currentEnv] || {});

export default config;
