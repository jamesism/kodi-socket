# kodi-socket

[![NPM](https://img.shields.io/npm/v/kodi-socket.svg)](http://npm.im/kodi-socket)

Kodi/XBMC class exposes JSON-RPC API and notifications

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

// or arbitrary commands
kodi.execute('Input.Back');
```

## Documentation

https://jamesism.github.io/kodi-socket/

## License

MIT
