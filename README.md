# S framework 

Scaffold out a Backbone.js, Express.js, PhantomJS and Gulp

## Status

[![Build Status](https://travis-ci.org/afrobambacar/s-web.svg?branch=master)](https://travis-ci.org/afrobambacar/s-web)
[![dependencies Status](https://david-dm.org/afrobambacar/s-web/status.svg)](https://david-dm.org/afrobambacar/s-web)
[![devDependencies Status](https://david-dm.org/afrobambacar/s-web/dev-status.svg)](https://david-dm.org/afrobambacar/s-web?type=dev)


## Directory Layout

Before you start, take a moment to see how the project structure looks like:

```
.
├── /app/
│   ├── /client/
│   │   ├── /Components/
│   │   ├── /core/
│   │   ├── /fonts/
│   │   ├── /images/
│   │   ├── /libs/
│   │   └── /models/
│   └── /server/
│       ├── /auth/
│       ├── /config/
│       ├── /controllers/
│       ├── /views/
│       ├── /app.js
│       └── /routers.js
├── /gulp/
├── /node_modules/
├── /circle.yml
├── /gulpfile.js
├── /package.json
└── /README.md
```

# Running

You should install dependencies.
```
$ npm install
```

Then you can start your new app by running `gulp` or `gulp serve`.
```
$ gulp
```

##  Build

Run `gulp build`. This will build your project into the dist folder by default.

```
$ gulp build
```

