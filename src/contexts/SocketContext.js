import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import io from "socket.io-client";
import { SERVER_URL } from "../config";
import { getToken, getUser } from "../lib/auth";

const SocketContext = createContext({
	socket: null,
	sendCommand: () => {},
	discoverDevices: () => {},
	registerDevice: () => {},
});

export function SocketProvider({ children }) {
	const [socket, setSocket] = useState(null);
	const connectingRef = useRef(false);

	useEffect(() => {
		(async () => {
			if (connectingRef.current) return;
			connectingRef.current = true;
			const token = await getToken();
			const s = io(SERVER_URL, {
				transports: ["websocket"],
				auth: { token },
			});
			// Authenticate with userId like web app
			const user = await getUser();
			if (user && (user.id || user._id)) {
				s.on("connect", () => {
					s.emit("authenticate", { userId: user.id || user._id });
				});
			}
			setSocket(s);
			return () => {
				s.disconnect();
			};
		})();
	}, []);

	const sendCommand = useMemo(() => {
		return (payload) => {
			if (!socket) return;
			try {
				socket.emit("sendCommand", payload);
			} catch (e) {
				// noop
			}
		};
	}, [socket]);

	const discoverDevices = useMemo(() => {
		return (payload = {}) => {
			if (!socket) return;
			try {
				socket.emit("discoverDevices", payload);
			} catch (e) {}
		};
	}, [socket]);

	const registerDevice = useMemo(() => {
		return (payload) => {
			if (!socket) return;
			try {
				socket.emit("registerDevice", payload);
			} catch (e) {}
		};
	}, [socket]);

	const value = useMemo(
		() => ({ socket, sendCommand, discoverDevices, registerDevice }),
		[socket, sendCommand, discoverDevices, registerDevice]
	);
	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
}

export function useSocket() {
	return useContext(SocketContext);
}
