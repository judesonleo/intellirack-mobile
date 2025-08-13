import { API_BASE } from "../config";

// Hybrid Smart Device Discovery Service
export class SmartDeviceDiscoveryService {
	constructor() {
		this.discoveryTimeout = 10000; // 10 seconds
		this.discoveryMethods = [
			{ name: "mDNS", priority: 1, method: this.mdnsDiscovery.bind(this) },
			{
				name: "Smart Network Scan",
				priority: 2,
				method: this.smartNetworkScan.bind(this),
			},
			{
				name: "Broadcast Discovery",
				priority: 3,
				method: this.broadcastDiscovery.bind(this),
			},
		];
	}

	// Main discovery method - tries multiple approaches intelligently
	async discoverDevices() {
		console.log("Starting Hybrid Smart Device Discovery...");

		const allDevices = [];
		const discoveredIds = new Set();

		// Try methods in priority order
		for (const method of this.discoveryMethods) {
			try {
				console.log(`Trying ${method.name} discovery...`);
				const devices = await method.method();

				// Add only new devices
				devices.forEach((device) => {
					const deviceId = device.deviceId || device.rackId;
					if (deviceId && !discoveredIds.has(deviceId)) {
						discoveredIds.add(deviceId);
						allDevices.push({
							...device,
							discoveredVia: method.name,
							priority: method.priority,
						});
					}
				});

				console.log(`${method.name} found ${devices.length} devices`);

				// If we found devices with high priority method, we can stop early
				if (devices.length > 0 && method.priority === 1) {
					console.log("High priority method successful, stopping discovery");
					break;
				}
			} catch (error) {
				console.log(`${method.name} failed:`, error.message);
			}
		}

		// Sort by priority and remove duplicates
		const uniqueDevices = this.deduplicateDevices(allDevices);
		console.log(`Total unique devices found: ${uniqueDevices.length}`);

		return uniqueDevices.sort((a, b) => a.priority - b.priority);
	}

	// Method 1: mDNS Discovery (Highest Priority) - ULTRA-OPTIMIZED
	async mdnsDiscovery() {
		const devices = [];

		// ULTRA-FAST: Try your exact device pattern FIRST
		const exactPatterns = [
			"intellirack_rack_002.local", // YOUR EXACT DEVICE
			"intellirack_rack_001.local", // Common pattern
			"intellirack_device.local", // Generic
		];

		// FAST: Common device ID patterns with underscores (not hyphens!)
		const commonPatterns = [
			"intellirack_001.local",
			"intellirack_002.local", // This will match your device!
			"intellirack_003.local",
			"intellirack_01.local",
			"intellirack_02.local",
			"intellirack_03.local",
		];

		// Combine patterns - exact first, then common
		const allPatterns = [...exactPatterns, ...commonPatterns];

		console.log("🔍 mDNS patterns to try:", allPatterns);

		// Try each pattern with ULTRA-FAST timeout
		for (const pattern of allPatterns) {
			try {
				console.log(`⚡ Trying mDNS: ${pattern}`);

				// Use 2-second timeout for mDNS (much faster)
				const device = await this.testDeviceConnection(pattern, 2000);

				if (device && this.isIntelliRackDevice(device)) {
					console.log(`✅ mDNS device found: ${pattern}`);
					devices.push({
						...device,
						ipAddress: pattern,
						discoveredVia: "mDNS",
						rackId: device.deviceId || device.rackId,
					});

					// STOP IMMEDIATELY when found - no need to try more patterns
					console.log("🚀 mDNS discovery successful, stopping early");
					return devices;
				}
			} catch (error) {
				console.log(`❌ mDNS ${pattern} failed:`, error.message);
			}
		}

		console.log("❌ No mDNS devices found, will try network scan");
		return devices;
	}

	// Method 2: Smart Network Scan (Medium Priority) - OPTIMIZED
	async smartNetworkScan() {
		const devices = [];

		// ONLY scan your current network range for speed
		const currentNetwork = await this.getCurrentNetworkInfo();
		const networkRanges = currentNetwork
			? [currentNetwork]
			: ["192.168.0", "192.168.1"];

		console.log(
			`🔍 Scanning only current network: ${networkRanges.join(", ")}`
		);

		// Scan only current network range
		for (const baseIP of networkRanges) {
			console.log(`⚡ Scanning: ${baseIP}.0/24`);
			const rangeDevices = await this.scanNetworkRange(baseIP);
			devices.push(...rangeDevices);
		}

		return devices;
	}

	// Get relevant network ranges based on current network
	getRelevantRanges(currentNetwork) {
		const ranges = ["192.168.1", "192.168.0", "10.0.0", "172.16.0"];

		// If we know current network, prioritize it
		if (currentNetwork && !ranges.includes(currentNetwork)) {
			ranges.unshift(currentNetwork);
		}

		return ranges;
	}

	// Scan a specific network range efficiently - OPTIMIZED
	async scanNetworkRange(baseIP) {
		const devices = [];

		// ONLY scan common IPs (100-120) instead of full range for speed
		const commonIPs = [
			100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
			115, 116, 117, 118, 119, 120,
		];

		console.log(
			`⚡ Scanning common IPs: ${commonIPs
				.map((ip) => `${baseIP}.${ip}`)
				.join(", ")}`
		);

		// Scan common IPs in parallel with fast timeout
		const promises = commonIPs.map((ip) => {
			const fullIP = `${baseIP}.${ip}`;
			return this.testDeviceConnection(fullIP, 1500); // 1.5 second timeout
		});

		const results = await Promise.allSettled(promises);

		results.forEach((result, index) => {
			if (result.status === "fulfilled" && result.value) {
				const ip = `${baseIP}.${commonIPs[index]}`;
				if (this.isIntelliRackDevice(result.value)) {
					devices.push({
						...result.value,
						ipAddress: ip,
						discoveredVia: "Smart Network Scan",
						rackId: result.value.deviceId || result.value.rackId,
					});
				}
			}
		});

		return devices;
	}

	// Method 3: Broadcast Discovery (Lowest Priority)
	async broadcastDiscovery() {
		try {
			// Try to use server-assisted broadcast discovery
			const response = await fetch(`${API_BASE}/broadcast-discovery`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "discover",
					timeout: 5000,
				}),
			});

			if (response.ok) {
				const { devices } = await response.json();
				return devices.filter((device) => this.isIntelliRackDevice(device));
			}
		} catch (error) {
			console.log("Broadcast discovery failed:", error.message);
		}

		return [];
	}

	// Test connection to a specific device - OPTIMIZED with custom timeout
	async testDeviceConnection(ipOrHostname, customTimeout = null) {
		try {
			const controller = new AbortController();
			const timeout = customTimeout || this.discoveryTimeout;

			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(`http://${ipOrHostname}/api/discovery`, {
				method: "GET",
				signal: controller.signal,
				headers: {
					Accept: "application/json",
				},
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const deviceData = await response.json();
				return deviceData;
			}

			return null;
		} catch (error) {
			if (error.name === "AbortError") {
				console.log(
					`⏰ Timeout (${
						customTimeout || this.discoveryTimeout
					}ms) connecting to ${ipOrHostname}`
				);
			} else {
				console.log(`❌ Connection failed to ${ipOrHostname}:`, error.message);
			}
			return null;
		}
	}

	// Check if discovered device is an IntelliRack device
	isIntelliRackDevice(device) {
		// Check for IntelliRack-specific identifiers
		const identifiers = ["deviceId", "rackId", "type", "firmwareVersion"];

		// Must have at least deviceId or rackId
		if (!device.deviceId && !device.rackId) {
			return false;
		}

		// Check if it's explicitly marked as IntelliRack
		if (device.type && device.type.toLowerCase().includes("intellirack")) {
			return true;
		}

		// Check if name contains IntelliRack
		if (device.name && device.name.toLowerCase().includes("intellirack")) {
			return true;
		}

		// Check if it has IntelliRack-like firmware
		if (device.firmwareVersion && device.firmwareVersion.includes("v")) {
			return true;
		}

		// If it has the discovery endpoint and basic structure, it's likely an IntelliRack device
		return identifiers.some((id) => device[id] !== undefined);
	}

	// Get current network information
	async getCurrentNetworkInfo() {
		try {
			const response = await fetch(`${API_BASE}/network-info`);
			if (response.ok) {
				const data = await response.json();
				return data.baseIP;
			}
		} catch (error) {
			console.log("Could not get current network info:", error.message);
		}
		return null;
	}

	// Remove duplicate devices based on deviceId/rackId
	deduplicateDevices(devices) {
		const seen = new Set();
		return devices.filter((device) => {
			const deviceId = device.deviceId || device.rackId;
			if (!deviceId || seen.has(deviceId)) {
				return false;
			}
			seen.add(deviceId);
			return true;
		});
	}

	// Validate discovered device data
	validateDevice(device) {
		const required = ["deviceId", "rackId", "ipAddress"];
		const hasRequired = required.some((field) => device[field]);

		if (!hasRequired) {
			console.warn(`Device missing required fields: ${required.join(", ")}`);
			return false;
		}

		return this.isIntelliRackDevice(device);
	}

	// Format device for display
	formatDevice(device) {
		return {
			rackId: device.deviceId || device.rackId,
			name: device.name || `IntelliRack ${device.deviceId || device.rackId}`,
			ip: device.ipAddress,
			firmwareVersion: device.firmwareVersion || "v2.0",
			location: device.location || "Unknown",
			discoveredVia: device.discoveredVia || "Unknown",
			priority: device.priority || 999,
			...device,
		};
	}

	// Get discovery statistics
	getDiscoveryStats() {
		return {
			methods: this.discoveryMethods.length,
			timeout: this.discoveryTimeout,
			priorityOrder: this.discoveryMethods.map((m) => m.name),
		};
	}
}

// Export singleton instance
export const smartDeviceDiscovery = new SmartDeviceDiscoveryService();
