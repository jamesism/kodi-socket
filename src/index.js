const SOCK_STATE = {
	CONNECTING: 0,
	OPEN : 1,
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
export default class Kodi {
	/**
	 * Constructor takes an configuration object where you specify the
	 * host and TCP port for your Kodi/XBMC instance.
	 * @param {Object} config - Configuration object
	 * @param {String} [config.host="localhost"] -  Kodi/XBMC Hos
	 * @param {String} [config.port="9999"] - Kodi/XBMC TCP Port
	 * @param {boolean} [config.connectImmediately=true] - Automatically establish connection or not. If false will wait for manual {@link Kodi#connect} call.
	 */
	constructor({
		host = 'localhost',
		port = '9999',
		connectImmediately = true
	} = {}) {
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
	static createKodiUrl(host, port) {
		return `ws://${host}:${port}/jsonrpc` || null;
	}

	/** @type {boolean} **/
	get connected() {
		return this.socket && this.socket.readyState === SOCK_STATE.OPEN;
	}

	/**
	 * Set the host and port
	 * @param {string} [host="Existing host"] - Kodi/XBMC host
	 * @param {string} [port="Existing port"] - Kodi/XBMC port
	 */
	setUrl(host = this.host, port = this.port) {
		this.host = host;
		this.port = port;

		this.url = Kodi.createKodiUrl(host, port);

		return this;
	}

	/**
	 * Establish web socket connection and clear any existing API.
	 */
	connect() {
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
	on(method, fn) {
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
	off(method, fn) {
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
	once(method, fn) {
		let once = () => {
			fn();
			this.off(method, once);
			once = null;
		};
		return this.on(method, once);
	}

	/**
	 * Execute an arbitrary Kodi/XBMC JSON-RPC method over web socket.
	 * @see http://kodi.wiki/view/JSON-RPC_API/v6#Methods
	 * @param {string} method - The method to invoke
	 * @param {Object} params - The params for the command (see individual method documentation)
	 * @returns {Promise<object, error>} Promise resolving with JSON-RPC `result` value or rejecting with JSON-RPC `error` value.
	 */
	execute(method, params) {
		if (!this.connected) throw new Error("Kodi.execute :: Cannot execute method when not connected");

		return new Promise( (resolve, reject) => {
			let message = Object.assign({},
				this.MESSAGE_TPL,
				{
					method,
					params
				});

			this.socket.send(JSON.stringify(message));
			this.waiting[message.id] = { resolve, reject };
		});
	}

	/**
	 * @private
	 */
	get MESSAGE_TPL() {
		return {
			id: ++this.messageId,
			jsonrpc: "2.0"
		};
	}

	/**
	 * @private
	 */
	onOpen(e) {
		if (listeners.open) listeners.open.forEach(fn => fn(e));

		this.execute('JSONRPC.Introspect').then(res => {
			if (!res || !res.methods) return $q.reject();

			let methods = Object.keys(res.methods);

			methods.forEach( method => {
				let [ns, m] = method.split('.');
				if (!this.api[ns]) this.api[ns] = {};
				this.api[ns][m] = this.execute.bind(this, method);
			});
		}, res => {
			throw new Error('Kodi.onOpen :: Error retrieving JSON RPC defintion from Kodi');
		});
	}

	/**
	 * @private
	 */
	onMessage(e) {
		let response = e && e.data && JSON.parse(e.data);

		if (!response) console.warn("Kodi.onMessage :: Received invalid JSON response.");

		let { id, result, error, method, params } = response;

		if (result && this.waiting[id]) {
			if (error) {
				this.waiting[id].reject(error);
			}
			else {
				this.waiting[id].resolve(result);
			}
			delete this.waiting[id];
		}
		else if (method && this.listeners[method]) {
			this.listeners[method].forEach( fn => fn(params));
		}
	}

	/**
	 * @private
	 */
	onClose(e) {
		if (listeners.close) listeners.close.forEach(fn => fn(e));

		this.socket = null;
	}

	/**
	 * @private
	 */
	onError(e) {
		if (listeners.error) listeners.error.forEach(fn => fn(e));

		this.lastError = e;
	}
}
