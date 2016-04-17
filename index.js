'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
			if (!listeners[method]) listeners[method] = [];
			listeners[method].push(fn);
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
			if (!listeners[method]) return this;
			if (listeners[method].indexOf(fn) === -1) return this;
			listener[method].remove(fn);
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

			if (listeners.open) listeners.open.forEach(function (fn) {
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
			if (listeners.close) listeners.close.forEach(function (fn) {
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
			if (listeners.error) listeners.error.forEach(function (fn) {
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
//# sourceMappingURL=data:application/json;base64,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QUssU0FBTCxDQUFlLE1BQWYsRUFBdUIsT0FBdkIsQ0FBZ0M7WUFBTSxHQUFHLE1BQUg7S0FBTixDQUFoQyxDQUQwQztJQUF0Qzs7Ozs7Ozs7OzBCQVFFLEdBQUc7QUFDVixPQUFJLFVBQVUsS0FBVixFQUFpQixVQUFVLEtBQVYsQ0FBZ0IsT0FBaEIsQ0FBd0I7V0FBTSxHQUFHLENBQUg7SUFBTixDQUF4QixDQUFyQjs7QUFFQSxRQUFLLE1BQUwsR0FBYyxJQUFkLENBSFU7Ozs7Ozs7OzswQkFTSCxHQUFHO0FBQ1YsT0FBSSxVQUFVLEtBQVYsRUFBaUIsVUFBVSxLQUFWLENBQWdCLE9BQWhCLENBQXdCO1dBQU0sR0FBRyxDQUFIO0lBQU4sQ0FBeEIsQ0FBckI7O0FBRUEsUUFBSyxTQUFMLEdBQWlCLENBQWpCLENBSFU7Ozs7Ozs7c0JBNUtLO0FBQ2YsVUFBTyxLQUFLLE1BQUwsSUFBZSxLQUFLLE1BQUwsQ0FBWSxVQUFaLEtBQTJCLFdBQVcsSUFBWCxDQURsQzs7OztzQkE0R0U7QUFDakIsVUFBTztBQUNOLFFBQUksRUFBRSxLQUFLLFNBQUw7QUFDTixhQUFTLEtBQVQ7SUFGRCxDQURpQjs7OztnQ0FqSEcsTUFBTSxNQUFNO0FBQ2hDLFVBQU8sVUFBUSxhQUFRLGlCQUFoQixJQUFrQyxJQUFsQyxDQUR5Qjs7OztRQS9CYiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZVJvb3QiOiJzcmMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEtvZGkvWEJNQyBjbGFzcyBleHBvc2VzIEpTT04tUlBDIEFQSSBhbmQgbm90aWZpY2F0aW9uc1xuICogQGV4YW1wbGVcbiAqIGxldCBrb2RpID0gbmV3IEtvZGkoeyBob3N0LCBwb3J0LCBjb25uZWN0SW1tZWRpYXRlbHk6IHRydWUgfSlcbiAqIGtvZGkuYXBpLlBsYXllci5QbGF5UGF1c2UoKTtcbiAqIGtvZGkuYXBpLlZpZGVvTGlicmFyeS5HZXRNb3ZpZXMoKS50aGVuKG1vdmllcyA9PiAuLi4gKTtcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgS29kaSB7XG5cdC8qKlxuXHQgKiBDb25zdHJ1Y3RvciB0YWtlcyBhbiBjb25maWd1cmF0aW9uIG9iamVjdCB3aGVyZSB5b3Ugc3BlY2lmeSB0aGVcblx0ICogaG9zdCBhbmQgVENQIHBvcnQgZm9yIHlvdXIgS29kaS9YQk1DIGluc3RhbmNlLlxuXHQgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3Rcblx0ICogQHBhcmFtIHtTdHJpbmd9IFtjb25maWcuaG9zdD1cImxvY2FsaG9zdFwiXSAtICBLb2RpL1hCTUMgSG9zXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBbY29uZmlnLnBvcnQ9XCI5OTk5XCJdIC0gS29kaS9YQk1DIFRDUCBQb3J0XG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5jb25uZWN0SW1tZWRpYXRlbHk9dHJ1ZV0gLSBBdXRvbWF0aWNhbGx5IGVzdGFibGlzaCBjb25uZWN0aW9uIG9yIG5vdC4gSWYgZmFsc2Ugd2lsbCB3YWl0IGZvciBtYW51YWwge0BsaW5rIEtvZGkjY29ubmVjdH0gY2FsbC5cblx0ICovXG5cdGNvbnN0cnVjdG9yKHtcblx0XHRob3N0ID0gJ2xvY2FsaG9zdCcsXG5cdFx0cG9ydCA9ICc5OTk5Jyxcblx0XHRjb25uZWN0SW1tZWRpYXRlbHkgPSB0cnVlXG5cdH0gPSB7fSkge1xuXHRcdHRoaXMuaG9zdCA9IGhvc3Q7XG5cdFx0dGhpcy5wb3J0ID0gcG9ydDtcblx0XHR0aGlzLnVybCA9IEtvZGkuY3JlYXRlS29kaVVybChob3N0LCBwb3J0KTtcblxuXHRcdHRoaXMuc29ja2V0ID0gbnVsbDtcblx0XHR0aGlzLm1lc3NhZ2VJZCA9IDA7XG5cblx0XHR0aGlzLndhaXRpbmcgPSB7fTtcblx0XHR0aGlzLmxpc3RlbmVycyA9IHt9O1xuXHRcdHRoaXMuYXBpID0ge307XG5cblx0XHRpZiAoY29ubmVjdEltbWVkaWF0ZWx5KSB0aGlzLmNvbm5lY3QoKTtcblx0fVxuXG5cdC8qXG5cdCAqIENyZWF0ZSBhIEtvZGkgd2ViIHNvY2tldCB1cmwgZnJvbSBob3N0IGFuZCBUQ1AgcG9ydFxuXHQgKi9cblx0c3RhdGljIGNyZWF0ZUtvZGlVcmwoaG9zdCwgcG9ydCkge1xuXHRcdHJldHVybiBgd3M6Ly8ke2hvc3R9OiR7cG9ydH0vanNvbnJwY2AgfHwgbnVsbDtcblx0fVxuXG5cdC8qKiBAdHlwZSB7Ym9vbGVhbn0gKiovXG5cdGdldCBjb25uZWN0ZWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc29ja2V0ICYmIHRoaXMuc29ja2V0LnJlYWR5U3RhdGUgPT09IFNPQ0tfU1RBVEUuT1BFTjtcblx0fVxuXG5cdC8qKlxuXHQgKiBTZXQgdGhlIGhvc3QgYW5kIHBvcnRcblx0ICogQHBhcmFtIHtzdHJpbmd9IFtob3N0PVwiRXhpc3RpbmcgaG9zdFwiXSAtIEtvZGkvWEJNQyBob3N0XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBbcG9ydD1cIkV4aXN0aW5nIHBvcnRcIl0gLSBLb2RpL1hCTUMgcG9ydFxuXHQgKi9cblx0c2V0VXJsKGhvc3QgPSB0aGlzLmhvc3QsIHBvcnQgPSB0aGlzLnBvcnQpIHtcblx0XHR0aGlzLmhvc3QgPSBob3N0O1xuXHRcdHRoaXMucG9ydCA9IHBvcnQ7XG5cblx0XHR0aGlzLnVybCA9IEtvZGkuY3JlYXRlS29kaVVybChob3N0LCBwb3J0KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIEVzdGFibGlzaCB3ZWIgc29ja2V0IGNvbm5lY3Rpb24gYW5kIGNsZWFyIGFueSBleGlzdGluZyBBUEkuXG5cdCAqL1xuXHRjb25uZWN0KCkge1xuXHRcdGlmICghdGhpcy51cmwpIHRocm93IG5ldyBFcnJvcihcIktvZGkuY29ubmVjdCA6OiBDYW5ub3QgY29ubmVjdCBubyB1cmwgc2V0LlwiKTtcblxuXHRcdHRoaXMuYXBpID0ge307XG5cblx0XHR0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQodGhpcy51cmwpO1xuXHRcdHRoaXMuc29ja2V0Lm9ub3BlbiA9IHRoaXMub25PcGVuLmJpbmQodGhpcyk7XG5cdFx0dGhpcy5zb2NrZXQub25lcnJvciA9IHRoaXMub25FcnJvci5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuc29ja2V0Lm9uY2xvc2UgPSB0aGlzLm9uQ2xvc2UuYmluZCh0aGlzKTtcblx0XHR0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogU3Vic2NyaWJlIGZvciBub3RpZmljYXRpb25zIGZyb20gS29kaS9YQk1DIGNvbm5lY3Rpb24uXG5cdCAqIENhbiBhbHNvIHN1YnNjcmliZSB0byB0aHJlZSB3ZWJzb2NrZXQgZXZlbnRzICdvcGVuJywgJ2Vycm9yJywgYW5kICdjbG9zZScuXG5cdCAqIEBzZWUgaHR0cDovL2tvZGkud2lraS92aWV3L0pTT04tUlBDX0FQSS92NiNOb3RpZmljYXRpb25zXzJcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIE1ldGhvZCBuYW1lXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIC0gVGhlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZC5cblx0ICogQHJldHVybnMgdGhpc1xuXHQgKi9cblx0b24obWV0aG9kLCBmbikge1xuXHRcdGlmICghbWV0aG9kIHx8ICFmbikgdGhyb3cgbmV3IEVycm9yKFwiS29kaS5vbiA6OiBNdXN0IHN1cHBseSBtZXRob2QgbmFtZSBhbmQgY2FsbGJhY2tcIik7XG5cdFx0aWYgKCFsaXN0ZW5lcnNbbWV0aG9kXSkgbGlzdGVuZXJzW21ldGhvZF0gPSBbXTtcblx0XHRsaXN0ZW5lcnNbbWV0aG9kXS5wdXNoKGZuKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBVbnN1YnNjcmliZSBmb3Igbm90aWZpY2F0aW9ucyBmcm9tIEtvZGkvWEJNQyBjb25uZWN0aW9uLlxuXHQgKiBBbHNvIGFwcGxpZXMgZm9yIHRocmVlIHdlYnNvY2tldCBldmVudHMgJ29wZW4nLCAnZXJyb3InLCBhbmQgJ2Nsb3NlJy5cblx0ICogQHNlZSBodHRwOi8va29kaS53aWtpL3ZpZXcvSlNPTi1SUENfQVBJL3Y2I05vdGlmaWNhdGlvbnNfMlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kIC0gTWV0aG9kIG5hbWVcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gLSBUaGUgY2FsbGJhY2sgdG8gYmUgcmVtb3ZlZC5cblx0ICogQHJldHVybnMgdGhpc1xuXHQgKi9cblx0b2ZmKG1ldGhvZCwgZm4pIHtcblx0XHRpZiAoIW1ldGhvZCB8fCAhZm4pIHRocm93IG5ldyBFcnJvcihcIktvZGkub24gOjogTXVzdCBzdXBwbHkgbWV0aG9kIG5hbWUgYW5kIGNhbGxiYWNrXCIpO1xuXHRcdGlmICghbGlzdGVuZXJzW21ldGhvZF0pIHJldHVybiB0aGlzO1xuXHRcdGlmIChsaXN0ZW5lcnNbbWV0aG9kXS5pbmRleE9mKGZuKSA9PT0gLTEpIHJldHVybiB0aGlzO1xuXHRcdGxpc3RlbmVyW21ldGhvZF0ucmVtb3ZlKGZuKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBTdWJzY3JpYmUgdG8gYSBub3RpZmljYXRpb24gZnJvbSBLb2RpL1hCTUMgY29ubmVjdGlvbiBvbmUgdGltZVxuXHQgKiBAc2VlIGh0dHA6Ly9rb2RpLndpa2kvdmlldy9KU09OLVJQQ19BUEkvdjYjTm90aWZpY2F0aW9uc18yXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSBNZXRob2QgbmFtZVxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAtIFRoZSBjYWxsYmFjayB0byBiZSBjYWxsZWQuXG5cdCAqIEByZXR1cm5zIHRoaXNcblx0ICovXG5cdG9uY2UobWV0aG9kLCBmbikge1xuXHRcdGxldCBvbmNlID0gKCkgPT4ge1xuXHRcdFx0Zm4oKTtcblx0XHRcdHRoaXMub2ZmKG1ldGhvZCwgb25jZSk7XG5cdFx0XHRvbmNlID0gbnVsbDtcblx0XHR9O1xuXHRcdHJldHVybiB0aGlzLm9uKG1ldGhvZCwgb25jZSk7XG5cdH1cblxuXHQvKipcblx0ICogRXhlY3V0ZSBhbiBhcmJpdHJhcnkgS29kaS9YQk1DIEpTT04tUlBDIG1ldGhvZCBvdmVyIHdlYiBzb2NrZXQuXG5cdCAqIEBzZWUgaHR0cDovL2tvZGkud2lraS92aWV3L0pTT04tUlBDX0FQSS92NiNNZXRob2RzXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSBUaGUgbWV0aG9kIHRvIGludm9rZVxuXHQgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtcyBmb3IgdGhlIGNvbW1hbmQgKHNlZSBpbmRpdmlkdWFsIG1ldGhvZCBkb2N1bWVudGF0aW9uKVxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTxvYmplY3QsIGVycm9yPn0gUHJvbWlzZSByZXNvbHZpbmcgd2l0aCBKU09OLVJQQyBgcmVzdWx0YCB2YWx1ZSBvciByZWplY3Rpbmcgd2l0aCBKU09OLVJQQyBgZXJyb3JgIHZhbHVlLlxuXHQgKi9cblx0ZXhlY3V0ZShtZXRob2QsIHBhcmFtcykge1xuXHRcdGlmICghdGhpcy5jb25uZWN0ZWQpIHRocm93IG5ldyBFcnJvcihcIktvZGkuZXhlY3V0ZSA6OiBDYW5ub3QgZXhlY3V0ZSBtZXRob2Qgd2hlbiBub3QgY29ubmVjdGVkXCIpO1xuXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRsZXQgbWVzc2FnZSA9IE9iamVjdC5hc3NpZ24oe30sXG5cdFx0XHRcdHRoaXMuTUVTU0FHRV9UUEwsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRtZXRob2QsXG5cdFx0XHRcdFx0cGFyYW1zXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKTtcblx0XHRcdHRoaXMud2FpdGluZ1ttZXNzYWdlLmlkXSA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGdldCBNRVNTQUdFX1RQTCgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aWQ6ICsrdGhpcy5tZXNzYWdlSWQsXG5cdFx0XHRqc29ucnBjOiBcIjIuMFwiXG5cdFx0fTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0b25PcGVuKGUpIHtcblx0XHRpZiAobGlzdGVuZXJzLm9wZW4pIGxpc3RlbmVycy5vcGVuLmZvckVhY2goZm4gPT4gZm4oZSkpO1xuXG5cdFx0dGhpcy5leGVjdXRlKCdKU09OUlBDLkludHJvc3BlY3QnKS50aGVuKHJlcyA9PiB7XG5cdFx0XHRpZiAoIXJlcyB8fCAhcmVzLm1ldGhvZHMpIHJldHVybiAkcS5yZWplY3QoKTtcblxuXHRcdFx0bGV0IG1ldGhvZHMgPSBPYmplY3Qua2V5cyhyZXMubWV0aG9kcyk7XG5cblx0XHRcdG1ldGhvZHMuZm9yRWFjaCggbWV0aG9kID0+IHtcblx0XHRcdFx0bGV0IFtucywgbV0gPSBtZXRob2Quc3BsaXQoJy4nKTtcblx0XHRcdFx0aWYgKCF0aGlzLmFwaVtuc10pIHRoaXMuYXBpW25zXSA9IHt9O1xuXHRcdFx0XHR0aGlzLmFwaVtuc11bbV0gPSB0aGlzLmV4ZWN1dGUuYmluZCh0aGlzLCBtZXRob2QpO1xuXHRcdFx0fSk7XG5cdFx0fSwgcmVzID0+IHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignS29kaS5vbk9wZW4gOjogRXJyb3IgcmV0cmlldmluZyBKU09OIFJQQyBkZWZpbnRpb24gZnJvbSBLb2RpJyk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQHByaXZhdGVcblx0ICovXG5cdG9uTWVzc2FnZShlKSB7XG5cdFx0bGV0IHJlc3BvbnNlID0gZSAmJiBlLmRhdGEgJiYgSlNPTi5wYXJzZShlLmRhdGEpO1xuXG5cdFx0aWYgKCFyZXNwb25zZSkgY29uc29sZS53YXJuKFwiS29kaS5vbk1lc3NhZ2UgOjogUmVjZWl2ZWQgaW52YWxpZCBKU09OIHJlc3BvbnNlLlwiKTtcblxuXHRcdGxldCB7IGlkLCByZXN1bHQsIGVycm9yLCBtZXRob2QsIHBhcmFtcyB9ID0gcmVzcG9uc2U7XG5cblx0XHRpZiAocmVzdWx0ICYmIHRoaXMud2FpdGluZ1tpZF0pIHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHR0aGlzLndhaXRpbmdbaWRdLnJlamVjdChlcnJvcik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy53YWl0aW5nW2lkXS5yZXNvbHZlKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRkZWxldGUgdGhpcy53YWl0aW5nW2lkXTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAobWV0aG9kICYmIHRoaXMubGlzdGVuZXJzW21ldGhvZF0pIHtcblx0XHRcdHRoaXMubGlzdGVuZXJzW21ldGhvZF0uZm9yRWFjaCggZm4gPT4gZm4ocGFyYW1zKSk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRvbkNsb3NlKGUpIHtcblx0XHRpZiAobGlzdGVuZXJzLmNsb3NlKSBsaXN0ZW5lcnMuY2xvc2UuZm9yRWFjaChmbiA9PiBmbihlKSk7XG5cblx0XHR0aGlzLnNvY2tldCA9IG51bGw7XG5cdH1cblxuXHQvKipcblx0ICogQHByaXZhdGVcblx0ICovXG5cdG9uRXJyb3IoZSkge1xuXHRcdGlmIChsaXN0ZW5lcnMuZXJyb3IpIGxpc3RlbmVycy5lcnJvci5mb3JFYWNoKGZuID0+IGZuKGUpKTtcblxuXHRcdHRoaXMubGFzdEVycm9yID0gZTtcblx0fVxufVxuIl19