# kodi-socket

[![NPM](https://img.shields.io/npm/v/kodi-socket.svg)](http://npm.im/kodi-socket)
[![Build Status](https://travis-ci.org/jamesism/kodi-socket.svg?branch=master)](https://travis-ci.org/jamesism/badges)


This is a Kodi/XBMC class that exposes the JSON-RPC API and notifications.

The API is defined based on JSON-RPC Introspection on the Kodi/XBMC server that you connect to. For full documentation of the available APIs refer to the [Kodi wiki](http://kodi.wiki/view/JSON-RPC_API/).

## Installation

```sh
npm install --save kodi-socket
```


## Usage

```js
import Kodi from 'kodi-socket';

let kodi = new Kodi({
	host: 'localhost',
	port: 9999,
	connectImmediately: true
});

kodi.api.Player.PlayPause();

kodi.api.VideoLibrary.GetMovies().then( movies => { ... } );

// or
let movies = await kodi.api.VideoLibrary.GetMovies();

// or arbitrary commands with dot notated identifiers
kodi.execute('Input.Back');
```

## Documentation

https://jamesism.github.io/kodi-socket/

## License

MIT
