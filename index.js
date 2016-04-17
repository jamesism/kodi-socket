'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SOCK_STATE = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3
};

/**
 * Kodi/XBMC class exposes JSON-RPC API and notifications
 * @example
 * let kodi = new Kodi({ host, port, connectImmediately: true })
 * kodi.api.Player.PlayPause();
 * kodi.api.VideoLibrary.GetMovies().then(movies => ... );
 */

var Kodi = function () {
	/**
  * Constructor takes an configuration object where you specify the
  * host and TCP port for your Kodi/XBMC instance.
  * @param {Object} config - Configuration object
  * @param {String} [config.host="localhost"] -  Kodi/XBMC Hos
  * @param {String} [config.port="9999"] - Kodi/XBMC TCP Port
  * @param {boolean} [config.connectImmediately=true] - Automatically establish connection or not. If false will wait for manual {@link Kodi#connect} call.
  */

	function Kodi() {
		var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		var _ref$host = _ref.host;
		var host = _ref$host === undefined ? 'localhost' : _ref$host;
		var _ref$port = _ref.port;
		var port = _ref$port === undefined ? '9999' : _ref$port;
		var _ref$connectImmediate = _ref.connectImmediately;
		var connectImmediately = _ref$connectImmediate === undefined ? true : _ref$connectImmediate;

		_classCallCheck(this, Kodi);

		this.host = host;
		this.port = port;
		this.url = Kodi.createKodiUrl(host, port);

		this.socket = null;
		this.messageId = 0;

		this.waiting = {};
		this.listeners = {};
		this.api = {};

		if (connectImmediately) this.connect();
	}

	/*
  * Create a Kodi web socket url from host and TCP port
  */


	_createClass(Kodi, [{
		key: 'setUrl',


		/**
   * Set the host and port
   * @param {string} [host="Existing host"] - Kodi/XBMC host
   * @param {string} [port="Existing port"] - Kodi/XBMC port
   */
		value: function setUrl() {
			var host = arguments.length <= 0 || arguments[0] === undefined ? this.host : arguments[0];
			var port = arguments.length <= 1 || arguments[1] === undefined ? this.port : arguments[1];

			this.host = host;
			this.port = port;

			this.url = Kodi.createKodiUrl(host, port);

			return this;
		}

		/**
   * Establish web socket connection and clear any existing API.
   */

	}, {
		key: 'connect',
		value: function connect() {
			if (!this.url) throw new Error("Kodi.connect :: Cannot connect no url set.");

			this.api = {};

			this.socket = new WebSocket(this.url);
			this.socket.onopen = this.onOpen.bind(this);
			this.socket.onerror = this.onError.bind(this);
			this.socket.onclose = this.onClose.bind(this);
			this.socket.onmessage = this.onMessage.bind(this);

			return this;
		}

		/**
   * Subscribe for notifications from Kodi/XBMC connection.
   * Can also subscribe to three websocket events 'open', 'error', and 'close'.
   * @see http://kodi.wiki/view/JSON-RPC_API/v6#Notifications_2
   * @param {string} method - Method name
   * @param {function} fn - The callback to be called.
   * @returns this
   */

	}, {
		key: 'on',
		value: function on(method, fn) {
			if (!method || !fn) throw new Error("Kodi.on :: Must supply method name and callback");
			if (!this.listeners[method]) this.listeners[method] = [];
			this.listeners[method].push(fn);
			return this;
		}

		/**
   * Unsubscribe for notifications from Kodi/XBMC connection.
   * Also applies for three websocket events 'open', 'error', and 'close'.
   * @see http://kodi.wiki/view/JSON-RPC_API/v6#Notifications_2
   * @param {string} method - Method name
   * @param {function} fn - The callback to be removed.
   * @returns this
   */

	}, {
		key: 'off',
		value: function off(method, fn) {
			if (!method || !fn) throw new Error("Kodi.on :: Must supply method name and callback");
			if (!this.listeners[method]) return this;
			if (this.listeners[method].indexOf(fn) === -1) return this;
			this.listener[method].remove(fn);
			return this;
		}

		/**
   * Subscribe to a notification from Kodi/XBMC connection one time
   * @see http://kodi.wiki/view/JSON-RPC_API/v6#Notifications_2
   * @param {string} method - Method name
   * @param {function} fn - The callback to be called.
   * @returns this
   */

	}, {
		key: 'once',
		value: function once(method, fn) {
			var _this = this;

			var _once = function once() {
				fn();
				_this.off(method, _once);
				_once = null;
			};
			return this.on(method, _once);
		}

		/**
   * Execute an arbitrary Kodi/XBMC JSON-RPC method over web socket.
   * @see http://kodi.wiki/view/JSON-RPC_API/v6#Methods
   * @param {string} method - The method to invoke
   * @param {Object} params - The params for the command (see individual method documentation)
   * @returns {Promise<object, error>} Promise resolving with JSON-RPC `result` value or rejecting with JSON-RPC `error` value.
   */

	}, {
		key: 'execute',
		value: function execute(method, params) {
			var _this2 = this;

			if (!this.connected) throw new Error("Kodi.execute :: Cannot execute method when not connected");

			return new Promise(function (resolve, reject) {
				var message = Object.assign({}, _this2.MESSAGE_TPL, {
					method: method,
					params: params
				});

				_this2.socket.send(JSON.stringify(message));
				_this2.waiting[message.id] = { resolve: resolve, reject: reject };
			});
		}

		/**
   * @private
   */

	}, {
		key: 'onOpen',


		/**
   * @private
   */
		value: function onOpen(e) {
			var _this3 = this;

			if (this.listeners.open) this.listeners.open.forEach(function (fn) {
				return fn(e);
			});

			this.execute('JSONRPC.Introspect').then(function (res) {
				if (!res || !res.methods) return $q.reject();

				var methods = Object.keys(res.methods);

				methods.forEach(function (method) {
					var _method$split = method.split('.');

					var _method$split2 = _slicedToArray(_method$split, 2);

					var ns = _method$split2[0];
					var m = _method$split2[1];

					if (!_this3.api[ns]) _this3.api[ns] = {};
					_this3.api[ns][m] = _this3.execute.bind(_this3, method);
				});
			}, function (res) {
				throw new Error('Kodi.onOpen :: Error retrieving JSON RPC defintion from Kodi');
			});
		}

		/**
   * @private
   */

	}, {
		key: 'onMessage',
		value: function onMessage(e) {
			var response = e && e.data && JSON.parse(e.data);

			if (!response) console.warn("Kodi.onMessage :: Received invalid JSON response.");

			var id = response.id;
			var result = response.result;
			var error = response.error;
			var method = response.method;
			var params = response.params;


			if (result && this.waiting[id]) {
				if (error) {
					this.waiting[id].reject(error);
				} else {
					this.waiting[id].resolve(result);
				}
				delete this.waiting[id];
			} else if (method && this.listeners[method]) {
				this.listeners[method].forEach(function (fn) {
					return fn(params);
				});
			}
		}

		/**
   * @private
   */

	}, {
		key: 'onClose',
		value: function onClose(e) {
			if (this.listeners.close) this.listeners.close.forEach(function (fn) {
				return fn(e);
			});

			this.socket = null;
		}

		/**
   * @private
   */

	}, {
		key: 'onError',
		value: function onError(e) {
			if (this.listeners.error) this.listeners.error.forEach(function (fn) {
				return fn(e);
			});

			this.lastError = e;
		}
	}, {
		key: 'connected',


		/** @type {boolean} **/
		get: function get() {
			return this.socket && this.socket.readyState === SOCK_STATE.OPEN;
		}
	}, {
		key: 'MESSAGE_TPL',
		get: function get() {
			return {
				id: ++this.messageId,
				jsonrpc: "2.0"
			};
		}
	}], [{
		key: 'createKodiUrl',
		value: function createKodiUrl(host, port) {
			return 'ws://' + host + ':' + port + '/jsonrpc' || null;
		}
	}]);

	return Kodi;
}();

exports.default = Kodi;
//# sourceMappingURL=data:application/json;base64,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R0s7QUFDSixVQUFLLE9BQUwsQ0FBYSxFQUFiLEVBQWlCLE9BQWpCLENBQXlCLE1BQXpCLEVBREk7S0FITDtBQU1BLFdBQU8sS0FBSyxPQUFMLENBQWEsRUFBYixDQUFQLENBUCtCO0lBQWhDLE1BU0ssSUFBSSxVQUFVLEtBQUssU0FBTCxDQUFlLE1BQWYsQ0FBVixFQUFrQztBQUMxQyxTQUFLLFNBQUwsQ0FBZSxNQUFmLEVBQXVCLE9BQXZCLENBQWdDO1lBQU0sR0FBRyxNQUFIO0tBQU4sQ0FBaEMsQ0FEMEM7SUFBdEM7Ozs7Ozs7OzswQkFRRSxHQUFHO0FBQ1YsT0FBSSxLQUFLLFNBQUwsQ0FBZSxLQUFmLEVBQXNCLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsT0FBckIsQ0FBNkI7V0FBTSxHQUFHLENBQUg7SUFBTixDQUE3QixDQUExQjs7QUFFQSxRQUFLLE1BQUwsR0FBYyxJQUFkLENBSFU7Ozs7Ozs7OzswQkFTSCxHQUFHO0FBQ1YsT0FBSSxLQUFLLFNBQUwsQ0FBZSxLQUFmLEVBQXNCLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsT0FBckIsQ0FBNkI7V0FBTSxHQUFHLENBQUg7SUFBTixDQUE3QixDQUExQjs7QUFFQSxRQUFLLFNBQUwsR0FBaUIsQ0FBakIsQ0FIVTs7Ozs7OztzQkE1S0s7QUFDZixVQUFPLEtBQUssTUFBTCxJQUFlLEtBQUssTUFBTCxDQUFZLFVBQVosS0FBMkIsV0FBVyxJQUFYLENBRGxDOzs7O3NCQTRHRTtBQUNqQixVQUFPO0FBQ04sUUFBSSxFQUFFLEtBQUssU0FBTDtBQUNOLGFBQVMsS0FBVDtJQUZELENBRGlCOzs7O2dDQWpIRyxNQUFNLE1BQU07QUFDaEMsVUFBTyxVQUFRLGFBQVEsaUJBQWhCLElBQWtDLElBQWxDLENBRHlCOzs7O1FBL0JiIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlUm9vdCI6InNyYyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IFNPQ0tfU1RBVEUgPSB7XG5cdENPTk5FQ1RJTkc6IDAsXG5cdE9QRU4gOiAxLFxuXHRDTE9TSU5HOiAyLFxuXHRDTE9TRUQ6IDNcbn07XG5cbi8qKlxuICogS29kaS9YQk1DIGNsYXNzIGV4cG9zZXMgSlNPTi1SUEMgQVBJIGFuZCBub3RpZmljYXRpb25zXG4gKiBAZXhhbXBsZVxuICogbGV0IGtvZGkgPSBuZXcgS29kaSh7IGhvc3QsIHBvcnQsIGNvbm5lY3RJbW1lZGlhdGVseTogdHJ1ZSB9KVxuICoga29kaS5hcGkuUGxheWVyLlBsYXlQYXVzZSgpO1xuICoga29kaS5hcGkuVmlkZW9MaWJyYXJ5LkdldE1vdmllcygpLnRoZW4obW92aWVzID0+IC4uLiApO1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBLb2RpIHtcblx0LyoqXG5cdCAqIENvbnN0cnVjdG9yIHRha2VzIGFuIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHdoZXJlIHlvdSBzcGVjaWZ5IHRoZVxuXHQgKiBob3N0IGFuZCBUQ1AgcG9ydCBmb3IgeW91ciBLb2RpL1hCTUMgaW5zdGFuY2UuXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuXHQgKiBAcGFyYW0ge1N0cmluZ30gW2NvbmZpZy5ob3N0PVwibG9jYWxob3N0XCJdIC0gIEtvZGkvWEJNQyBIb3Ncblx0ICogQHBhcmFtIHtTdHJpbmd9IFtjb25maWcucG9ydD1cIjk5OTlcIl0gLSBLb2RpL1hCTUMgVENQIFBvcnRcblx0ICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLmNvbm5lY3RJbW1lZGlhdGVseT10cnVlXSAtIEF1dG9tYXRpY2FsbHkgZXN0YWJsaXNoIGNvbm5lY3Rpb24gb3Igbm90LiBJZiBmYWxzZSB3aWxsIHdhaXQgZm9yIG1hbnVhbCB7QGxpbmsgS29kaSNjb25uZWN0fSBjYWxsLlxuXHQgKi9cblx0Y29uc3RydWN0b3Ioe1xuXHRcdGhvc3QgPSAnbG9jYWxob3N0Jyxcblx0XHRwb3J0ID0gJzk5OTknLFxuXHRcdGNvbm5lY3RJbW1lZGlhdGVseSA9IHRydWVcblx0fSA9IHt9KSB7XG5cdFx0dGhpcy5ob3N0ID0gaG9zdDtcblx0XHR0aGlzLnBvcnQgPSBwb3J0O1xuXHRcdHRoaXMudXJsID0gS29kaS5jcmVhdGVLb2RpVXJsKGhvc3QsIHBvcnQpO1xuXG5cdFx0dGhpcy5zb2NrZXQgPSBudWxsO1xuXHRcdHRoaXMubWVzc2FnZUlkID0gMDtcblxuXHRcdHRoaXMud2FpdGluZyA9IHt9O1xuXHRcdHRoaXMubGlzdGVuZXJzID0ge307XG5cdFx0dGhpcy5hcGkgPSB7fTtcblxuXHRcdGlmIChjb25uZWN0SW1tZWRpYXRlbHkpIHRoaXMuY29ubmVjdCgpO1xuXHR9XG5cblx0Lypcblx0ICogQ3JlYXRlIGEgS29kaSB3ZWIgc29ja2V0IHVybCBmcm9tIGhvc3QgYW5kIFRDUCBwb3J0XG5cdCAqL1xuXHRzdGF0aWMgY3JlYXRlS29kaVVybChob3N0LCBwb3J0KSB7XG5cdFx0cmV0dXJuIGB3czovLyR7aG9zdH06JHtwb3J0fS9qc29ucnBjYCB8fCBudWxsO1xuXHR9XG5cblx0LyoqIEB0eXBlIHtib29sZWFufSAqKi9cblx0Z2V0IGNvbm5lY3RlZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5zb2NrZXQgJiYgdGhpcy5zb2NrZXQucmVhZHlTdGF0ZSA9PT0gU09DS19TVEFURS5PUEVOO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNldCB0aGUgaG9zdCBhbmQgcG9ydFxuXHQgKiBAcGFyYW0ge3N0cmluZ30gW2hvc3Q9XCJFeGlzdGluZyBob3N0XCJdIC0gS29kaS9YQk1DIGhvc3Rcblx0ICogQHBhcmFtIHtzdHJpbmd9IFtwb3J0PVwiRXhpc3RpbmcgcG9ydFwiXSAtIEtvZGkvWEJNQyBwb3J0XG5cdCAqL1xuXHRzZXRVcmwoaG9zdCA9IHRoaXMuaG9zdCwgcG9ydCA9IHRoaXMucG9ydCkge1xuXHRcdHRoaXMuaG9zdCA9IGhvc3Q7XG5cdFx0dGhpcy5wb3J0ID0gcG9ydDtcblxuXHRcdHRoaXMudXJsID0gS29kaS5jcmVhdGVLb2RpVXJsKGhvc3QsIHBvcnQpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogRXN0YWJsaXNoIHdlYiBzb2NrZXQgY29ubmVjdGlvbiBhbmQgY2xlYXIgYW55IGV4aXN0aW5nIEFQSS5cblx0ICovXG5cdGNvbm5lY3QoKSB7XG5cdFx0aWYgKCF0aGlzLnVybCkgdGhyb3cgbmV3IEVycm9yKFwiS29kaS5jb25uZWN0IDo6IENhbm5vdCBjb25uZWN0IG5vIHVybCBzZXQuXCIpO1xuXG5cdFx0dGhpcy5hcGkgPSB7fTtcblxuXHRcdHRoaXMuc29ja2V0ID0gbmV3IFdlYlNvY2tldCh0aGlzLnVybCk7XG5cdFx0dGhpcy5zb2NrZXQub25vcGVuID0gdGhpcy5vbk9wZW4uYmluZCh0aGlzKTtcblx0XHR0aGlzLnNvY2tldC5vbmVycm9yID0gdGhpcy5vbkVycm9yLmJpbmQodGhpcyk7XG5cdFx0dGhpcy5zb2NrZXQub25jbG9zZSA9IHRoaXMub25DbG9zZS5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMub25NZXNzYWdlLmJpbmQodGhpcyk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBTdWJzY3JpYmUgZm9yIG5vdGlmaWNhdGlvbnMgZnJvbSBLb2RpL1hCTUMgY29ubmVjdGlvbi5cblx0ICogQ2FuIGFsc28gc3Vic2NyaWJlIHRvIHRocmVlIHdlYnNvY2tldCBldmVudHMgJ29wZW4nLCAnZXJyb3InLCBhbmQgJ2Nsb3NlJy5cblx0ICogQHNlZSBodHRwOi8va29kaS53aWtpL3ZpZXcvSlNPTi1SUENfQVBJL3Y2I05vdGlmaWNhdGlvbnNfMlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kIC0gTWV0aG9kIG5hbWVcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gLSBUaGUgY2FsbGJhY2sgdG8gYmUgY2FsbGVkLlxuXHQgKiBAcmV0dXJucyB0aGlzXG5cdCAqL1xuXHRvbihtZXRob2QsIGZuKSB7XG5cdFx0aWYgKCFtZXRob2QgfHwgIWZuKSB0aHJvdyBuZXcgRXJyb3IoXCJLb2RpLm9uIDo6IE11c3Qgc3VwcGx5IG1ldGhvZCBuYW1lIGFuZCBjYWxsYmFja1wiKTtcblx0XHRpZiAoIXRoaXMubGlzdGVuZXJzW21ldGhvZF0pIHRoaXMubGlzdGVuZXJzW21ldGhvZF0gPSBbXTtcblx0XHR0aGlzLmxpc3RlbmVyc1ttZXRob2RdLnB1c2goZm4pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFVuc3Vic2NyaWJlIGZvciBub3RpZmljYXRpb25zIGZyb20gS29kaS9YQk1DIGNvbm5lY3Rpb24uXG5cdCAqIEFsc28gYXBwbGllcyBmb3IgdGhyZWUgd2Vic29ja2V0IGV2ZW50cyAnb3BlbicsICdlcnJvcicsIGFuZCAnY2xvc2UnLlxuXHQgKiBAc2VlIGh0dHA6Ly9rb2RpLndpa2kvdmlldy9KU09OLVJQQ19BUEkvdjYjTm90aWZpY2F0aW9uc18yXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSBNZXRob2QgbmFtZVxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAtIFRoZSBjYWxsYmFjayB0byBiZSByZW1vdmVkLlxuXHQgKiBAcmV0dXJucyB0aGlzXG5cdCAqL1xuXHRvZmYobWV0aG9kLCBmbikge1xuXHRcdGlmICghbWV0aG9kIHx8ICFmbikgdGhyb3cgbmV3IEVycm9yKFwiS29kaS5vbiA6OiBNdXN0IHN1cHBseSBtZXRob2QgbmFtZSBhbmQgY2FsbGJhY2tcIik7XG5cdFx0aWYgKCF0aGlzLmxpc3RlbmVyc1ttZXRob2RdKSByZXR1cm4gdGhpcztcblx0XHRpZiAodGhpcy5saXN0ZW5lcnNbbWV0aG9kXS5pbmRleE9mKGZuKSA9PT0gLTEpIHJldHVybiB0aGlzO1xuXHRcdHRoaXMubGlzdGVuZXJbbWV0aG9kXS5yZW1vdmUoZm4pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFN1YnNjcmliZSB0byBhIG5vdGlmaWNhdGlvbiBmcm9tIEtvZGkvWEJNQyBjb25uZWN0aW9uIG9uZSB0aW1lXG5cdCAqIEBzZWUgaHR0cDovL2tvZGkud2lraS92aWV3L0pTT04tUlBDX0FQSS92NiNOb3RpZmljYXRpb25zXzJcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIE1ldGhvZCBuYW1lXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIC0gVGhlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZC5cblx0ICogQHJldHVybnMgdGhpc1xuXHQgKi9cblx0b25jZShtZXRob2QsIGZuKSB7XG5cdFx0bGV0IG9uY2UgPSAoKSA9PiB7XG5cdFx0XHRmbigpO1xuXHRcdFx0dGhpcy5vZmYobWV0aG9kLCBvbmNlKTtcblx0XHRcdG9uY2UgPSBudWxsO1xuXHRcdH07XG5cdFx0cmV0dXJuIHRoaXMub24obWV0aG9kLCBvbmNlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBFeGVjdXRlIGFuIGFyYml0cmFyeSBLb2RpL1hCTUMgSlNPTi1SUEMgbWV0aG9kIG92ZXIgd2ViIHNvY2tldC5cblx0ICogQHNlZSBodHRwOi8va29kaS53aWtpL3ZpZXcvSlNPTi1SUENfQVBJL3Y2I01ldGhvZHNcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIFRoZSBtZXRob2QgdG8gaW52b2tlXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1zIGZvciB0aGUgY29tbWFuZCAoc2VlIGluZGl2aWR1YWwgbWV0aG9kIGRvY3VtZW50YXRpb24pXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlPG9iamVjdCwgZXJyb3I+fSBQcm9taXNlIHJlc29sdmluZyB3aXRoIEpTT04tUlBDIGByZXN1bHRgIHZhbHVlIG9yIHJlamVjdGluZyB3aXRoIEpTT04tUlBDIGBlcnJvcmAgdmFsdWUuXG5cdCAqL1xuXHRleGVjdXRlKG1ldGhvZCwgcGFyYW1zKSB7XG5cdFx0aWYgKCF0aGlzLmNvbm5lY3RlZCkgdGhyb3cgbmV3IEVycm9yKFwiS29kaS5leGVjdXRlIDo6IENhbm5vdCBleGVjdXRlIG1ldGhvZCB3aGVuIG5vdCBjb25uZWN0ZWRcIik7XG5cblx0XHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGxldCBtZXNzYWdlID0gT2JqZWN0LmFzc2lnbih7fSxcblx0XHRcdFx0dGhpcy5NRVNTQUdFX1RQTCxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG1ldGhvZCxcblx0XHRcdFx0XHRwYXJhbXNcblx0XHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuXHRcdFx0dGhpcy53YWl0aW5nW21lc3NhZ2UuaWRdID0geyByZXNvbHZlLCByZWplY3QgfTtcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0Z2V0IE1FU1NBR0VfVFBMKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRpZDogKyt0aGlzLm1lc3NhZ2VJZCxcblx0XHRcdGpzb25ycGM6IFwiMi4wXCJcblx0XHR9O1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRvbk9wZW4oZSkge1xuXHRcdGlmICh0aGlzLmxpc3RlbmVycy5vcGVuKSB0aGlzLmxpc3RlbmVycy5vcGVuLmZvckVhY2goZm4gPT4gZm4oZSkpO1xuXG5cdFx0dGhpcy5leGVjdXRlKCdKU09OUlBDLkludHJvc3BlY3QnKS50aGVuKHJlcyA9PiB7XG5cdFx0XHRpZiAoIXJlcyB8fCAhcmVzLm1ldGhvZHMpIHJldHVybiAkcS5yZWplY3QoKTtcblxuXHRcdFx0bGV0IG1ldGhvZHMgPSBPYmplY3Qua2V5cyhyZXMubWV0aG9kcyk7XG5cblx0XHRcdG1ldGhvZHMuZm9yRWFjaCggbWV0aG9kID0+IHtcblx0XHRcdFx0bGV0IFtucywgbV0gPSBtZXRob2Quc3BsaXQoJy4nKTtcblx0XHRcdFx0aWYgKCF0aGlzLmFwaVtuc10pIHRoaXMuYXBpW25zXSA9IHt9O1xuXHRcdFx0XHR0aGlzLmFwaVtuc11bbV0gPSB0aGlzLmV4ZWN1dGUuYmluZCh0aGlzLCBtZXRob2QpO1xuXHRcdFx0fSk7XG5cdFx0fSwgcmVzID0+IHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignS29kaS5vbk9wZW4gOjogRXJyb3IgcmV0cmlldmluZyBKU09OIFJQQyBkZWZpbnRpb24gZnJvbSBLb2RpJyk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQHByaXZhdGVcblx0ICovXG5cdG9uTWVzc2FnZShlKSB7XG5cdFx0bGV0IHJlc3BvbnNlID0gZSAmJiBlLmRhdGEgJiYgSlNPTi5wYXJzZShlLmRhdGEpO1xuXG5cdFx0aWYgKCFyZXNwb25zZSkgY29uc29sZS53YXJuKFwiS29kaS5vbk1lc3NhZ2UgOjogUmVjZWl2ZWQgaW52YWxpZCBKU09OIHJlc3BvbnNlLlwiKTtcblxuXHRcdGxldCB7IGlkLCByZXN1bHQsIGVycm9yLCBtZXRob2QsIHBhcmFtcyB9ID0gcmVzcG9uc2U7XG5cblx0XHRpZiAocmVzdWx0ICYmIHRoaXMud2FpdGluZ1tpZF0pIHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHR0aGlzLndhaXRpbmdbaWRdLnJlamVjdChlcnJvcik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy53YWl0aW5nW2lkXS5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRkZWxldGUgdGhpcy53YWl0aW5nW2lkXTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAobWV0aG9kICYmIHRoaXMubGlzdGVuZXJzW21ldGhvZF0pIHtcblx0XHRcdHRoaXMubGlzdGVuZXJzW21ldGhvZF0uZm9yRWFjaCggZm4gPT4gZm4ocGFyYW1zKSk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRvbkNsb3NlKGUpIHtcblx0XHRpZiAodGhpcy5saXN0ZW5lcnMuY2xvc2UpIHRoaXMubGlzdGVuZXJzLmNsb3NlLmZvckVhY2goZm4gPT4gZm4oZSkpO1xuXG5cdFx0dGhpcy5zb2NrZXQgPSBudWxsO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRvbkVycm9yKGUpIHtcblx0XHRpZiAodGhpcy5saXN0ZW5lcnMuZXJyb3IpIHRoaXMubGlzdGVuZXJzLmVycm9yLmZvckVhY2goZm4gPT4gZm4oZSkpO1xuXG5cdFx0dGhpcy5sYXN0RXJyb3IgPSBlO1xuXHR9XG59XG4iXX0=