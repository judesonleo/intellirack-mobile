import { API_BASE } from "../config";
import { getToken } from "../lib/auth";

// Hybrid Smart Device Discovery Service
export class SmartDeviceDiscoveryService {
	constructor() {
		this.discoveryTimeout = 10000; // 10 seconds
		this.registeredDevices = new Set();
		this.discoveryMethods = [
			{
				name: "Server Discovery",
				priority: 1,
				method: this.serverDiscovery.bind(this),
			},
			{ name: "mDNS", priority: 2, method: this.mdnsDiscovery.bind(this) },
			{
				name: "Smart Network Scan",
				priority: 3,
				method: this.smartNetworkScan.bind(this),
			},
			{
				name: "Broadcast Discovery",
				priority: 4,
				method: this.broadcastDiscovery.bind(this),
			},
		];
	}

	// Main discovery method - real-time discovery with callbacks
	async discoverDevices(onDeviceFound = null, onProgressUpdate = null) {
		console.log("Starting Real-time Hybrid Device Discovery...");

		// First, load registered devices to mark them
		await this.loadRegisteredDevices();

		const discoveredIds = new Set();
		let deviceCount = 0;

		const processDevice = (device, discoveredVia, priority) => {
			const deviceId = device.deviceId || device.rackId;
			if (deviceId && !discoveredIds.has(deviceId)) {
				discoveredIds.add(deviceId);
				const processedDevice = {
					...device,
					discoveredVia,
					priority,
					isRegistered: this.registeredDevices.has(deviceId),
				};

				deviceCount++;
				console.log(
					`✅ Found device ${deviceCount}: ${deviceId} via ${discoveredVia}`
				);

				// Immediately notify UI
				if (onDeviceFound) {
					onDeviceFound(this.formatDevice(processedDevice));
				}
			}
		};

		// Try methods with real-time callbacks
		for (const method of this.discoveryMethods) {
			try {
				onProgressUpdate?.(`Starting ${method.name}...`);
				console.log(`Trying ${method.name} discovery...`);

				if (method.name === "Server Discovery") {
					await this.serverDiscoveryRealtime(
						(device, discoveredVia, priority) =>
							processDevice(device, discoveredVia, priority),
						onProgressUpdate
					);
				} else if (method.name === "mDNS") {
					await this.mdnsDiscoveryRealtime(
						(device, discoveredVia, priority) =>
							processDevice(device, discoveredVia, priority),
						onProgressUpdate
					);
				} else if (method.name === "Smart Network Scan") {
					await this.smartNetworkScanRealtime(
						(device, discoveredVia, priority) =>
							processDevice(device, discoveredVia, priority),
						onProgressUpdate
					);
				} else {
					// Fallback for other methods
					const devices = await method.method();
					devices.forEach((device) =>
						processDevice(device, method.name, method.priority)
					);
				}
			} catch (error) {
				console.log(`${method.name} failed:`, error.message);
			}
		}

		onProgressUpdate?.(`Discovery complete! Found ${deviceCount} devices.`);
		console.log(`🎯 Total discovery complete: ${deviceCount} devices found`);

		return deviceCount;
	}

	// Load registered devices from server
	async loadRegisteredDevices() {
		try {
			const token = await getToken();
			const response = await fetch(`${API_BASE}/devices`, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const { devices } = await response.json();
				this.registeredDevices = new Set(
					devices.map((d) => d.rackId || d.deviceId).filter(Boolean)
				);
				console.log(`Loaded ${this.registeredDevices.size} registered devices`);
			}
		} catch (error) {
			console.log("Failed to load registered devices:", error.message);
		}
	}

	// Method 1: Server Discovery - Real-time version
	async serverDiscoveryRealtime(onDeviceFound, onProgressUpdate) {
		try {
			const token = await getToken();

			// Get current network info first
			const currentNetwork = await this.getCurrentNetworkInfo();
			const networkRanges = currentNetwork
				? [currentNetwork, "192.168.1", "192.168.0", "10.0.0", "172.16.0"]
				: ["192.168.1", "192.168.0", "10.0.0", "172.16.0"];

			// Scan multiple network ranges via server with real-time updates
			for (const ipRange of networkRanges) {
				try {
					onProgressUpdate?.(`Scanning ${ipRange}.0/24 via server...`);
					console.log(`🌐 Server scanning network: ${ipRange}.0/24`);

					const response = await fetch(`${API_BASE}/discovery/scan`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							ipRange: ipRange,
							timeout: 3000,
						}),
					});

					if (response.ok) {
						const { devices } = await response.json();

						// Process each device immediately
						devices
							.filter((device) => this.isIntelliRackDevice(device))
							.forEach((device) => {
								onDeviceFound(
									{
										...device,
										ipAddress: device.ipAddress || device.ip,
									},
									"Server Discovery",
									1
								);
							});

						console.log(
							`📡 Server found ${devices.length} devices in ${ipRange}.0/24`
						);
					}
				} catch (error) {
					console.log(`❌ Server scan failed for ${ipRange}:`, error.message);
				}
			}
		} catch (error) {
			console.log("Server discovery failed:", error.message);
		}
	}

	// Method 1: Server Discovery (uses server's network scan) - Legacy
	async serverDiscovery() {
		try {
			const token = await getToken();

			// Get current network info first
			const currentNetwork = await this.getCurrentNetworkInfo();
			const networkRanges = currentNetwork
				? [currentNetwork, "192.168.1", "192.168.0", "10.0.0", "172.16.0"]
				: ["192.168.1", "192.168.0", "10.0.0", "172.16.0"];

			const allDevices = [];

			// Scan multiple network ranges via server
			for (const ipRange of networkRanges) {
				try {
					console.log(`🌐 Server scanning network: ${ipRange}.0/24`);

					const response = await fetch(`${API_BASE}/discovery/scan`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							ipRange: ipRange,
							timeout: 3000, // Faster timeout for server scanning
						}),
					});

					if (response.ok) {
						const { devices } = await response.json();
						const validDevices = devices
							.filter((device) => this.isIntelliRackDevice(device))
							.map((device) => ({
								...device,
								ipAddress: device.ipAddress || device.ip,
								discoveredVia: "Server Discovery",
							}));

						allDevices.push(...validDevices);
						console.log(
							`📡 Server found ${validDevices.length} devices in ${ipRange}.0/24`
						);

						// If we found devices in this range, we can break early for speed
						// But continue if no devices to ensure comprehensive scan
					}
				} catch (error) {
					console.log(`❌ Server scan failed for ${ipRange}:`, error.message);
				}
			}

			console.log(
				`🎯 Total server discovery: ${allDevices.length} devices found`
			);
			return allDevices;
		} catch (error) {
			console.log("Server discovery failed:", error.message);
		}

		return [];
	}

	// Method 2: mDNS Discovery - Real-time version with IntelliRack optimization
	async mdnsDiscoveryRealtime(onDeviceFound, onProgressUpdate) {
		onProgressUpdate?.("Checking IntelliRack device names...");

		// OPTIMIZED: Since all devices start with "intellirack", try these patterns first
		const intellirackPatterns = [
			// Auto-generated device patterns (most common)
			"rack_001.local",
			"rack_002.local",
			"rack_003.local",
			"rack_004.local",
			"rack_005.local",
			// With prefix patterns
			"intellirack_rack_001.local",
			"intellirack_rack_002.local",
			"intellirack_rack_003.local",
			// Common numbering patterns
			"intellirack_001.local",
			"intellirack_002.local",
			"intellirack_003.local",
			"intellirack_01.local",
			"intellirack_02.local",
			"intellirack_03.local",
			// Generic patterns
			"intellirack.local",
			"intellirack_device.local",
		];

		console.log(
			`🔍 Trying ${intellirackPatterns.length} IntelliRack mDNS patterns`
		);

		// Test patterns with real-time updates
		for (const pattern of intellirackPatterns) {
			try {
				onProgressUpdate?.(`Checking ${pattern}...`);
				console.log(`⚡ Trying mDNS: ${pattern}`);

				const device = await this.testDeviceConnection(pattern, 2000);

				if (device && this.isIntelliRackDevice(device)) {
					console.log(`✅ mDNS device found: ${pattern}`);

					// Immediately notify UI
					onDeviceFound(
						{
							...device,
							ipAddress: pattern,
							rackId: device.deviceId || device.rackId,
						},
						"mDNS Discovery",
						2
					);

					// Continue checking other patterns - don't stop early
					// This ensures we find ALL devices, not just the first one
				}
			} catch (error) {
				console.log(`❌ mDNS ${pattern} failed:`, error.message);
			}
		}

		console.log("mDNS discovery phase complete");
	}

	// Method 2: mDNS Discovery - ULTRA-OPTIMIZED (Legacy)
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

	// Method 3: Smart Network Scan - Real-time version
	async smartNetworkScanRealtime(onDeviceFound, onProgressUpdate) {
		// Get current network and scan multiple ranges for completeness
		const currentNetwork = await this.getCurrentNetworkInfo();
		const networkRanges = this.getRelevantRanges(currentNetwork);

		onProgressUpdate?.(`Scanning ${networkRanges.length} network ranges...`);
		console.log(`🔍 Real-time network scan: ${networkRanges.join(", ")}`);

		// Scan all relevant network ranges with real-time updates
		for (const baseIP of networkRanges) {
			onProgressUpdate?.(`Scanning ${baseIP}.0/24...`);
			console.log(`⚡ Scanning: ${baseIP}.0/24`);

			await this.scanNetworkRangeRealtime(
				baseIP,
				onDeviceFound,
				onProgressUpdate
			);
		}

		console.log("Network scan phase complete");
	}

	// Real-time network range scanner
	async scanNetworkRangeRealtime(baseIP, onDeviceFound, onProgressUpdate) {
		// COMPREHENSIVE scan: Multiple IP ranges to catch all devices
		const ipRanges = [
			{ start: 1, end: 50, name: "Router Range" },
			{ start: 50, end: 99, name: "DHCP Range" },
			{ start: 100, end: 150, name: "Device Range" },
			{ start: 150, end: 200, name: "Extended Range" },
			{ start: 200, end: 254, name: "High Range" },
		];

		for (const range of ipRanges) {
			onProgressUpdate?.(`Scanning ${range.name.toLowerCase()}...`);
			console.log(
				`📡 Scanning ${range.name}: ${baseIP}.${range.start}-${range.end}`
			);

			// Scan this range in batches with real-time updates
			const batchSize = 25; // Smaller batches for more responsive updates

			for (let ip = range.start; ip <= range.end; ip += batchSize) {
				const endIP = Math.min(ip + batchSize - 1, range.end);
				const promises = [];

				// Create batch of promises
				for (let currentIP = ip; currentIP <= endIP; currentIP++) {
					const fullIP = `${baseIP}.${currentIP}`;
					promises.push(
						this.testDeviceConnection(fullIP, 800) // Even faster timeout for real-time
							.then((result) => {
								if (result && this.isIntelliRackDevice(result)) {
									console.log(`✅ Found IntelliRack device at ${fullIP}`);

									// Immediately notify UI
									onDeviceFound(
										{
											...result,
											ipAddress: fullIP,
											rackId: result.deviceId || result.rackId,
										},
										"Smart Network Scan",
										3
									);
								}
								return result;
							})
							.catch(() => null)
					);
				}

				// Execute batch and wait for completion
				await Promise.allSettled(promises);

				// Small delay to prevent overwhelming the network
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
		}
	}

	// Method 3: Smart Network Scan (Medium Priority) - COMPREHENSIVE (Legacy)
	async smartNetworkScan() {
		const devices = [];

		// Get current network and scan multiple ranges for completeness
		const currentNetwork = await this.getCurrentNetworkInfo();
		const networkRanges = this.getRelevantRanges(currentNetwork);

		console.log(`🔍 Comprehensive network scan: ${networkRanges.join(", ")}`);

		// Scan all relevant network ranges
		for (const baseIP of networkRanges) {
			console.log(`⚡ Scanning: ${baseIP}.0/24`);
			const rangeDevices = await this.scanNetworkRange(baseIP);
			devices.push(...rangeDevices);

			// Log progress
			console.log(`📊 Found ${rangeDevices.length} devices in ${baseIP}.0/24`);
		}

		console.log(`🎯 Total network scan: ${devices.length} devices found`);
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

	// Scan a specific network range efficiently - COMPREHENSIVE
	async scanNetworkRange(baseIP) {
		const devices = [];

		// COMPREHENSIVE scan: Multiple IP ranges to catch all devices
		const ipRanges = [
			// Common router ranges
			{ start: 1, end: 50, name: "Router Range" },
			// Common device ranges
			{ start: 100, end: 150, name: "Device Range" },
			// DHCP ranges
			{ start: 50, end: 99, name: "DHCP Range" },
			// Extended ranges
			{ start: 150, end: 200, name: "Extended Range" },
			// High ranges
			{ start: 200, end: 254, name: "High Range" },
		];

		console.log(`🔍 Comprehensive scan of ${baseIP}.0/24 network`);

		// Scan all ranges in parallel with batching for performance
		const allPromises = [];

		for (const range of ipRanges) {
			console.log(
				`📡 Scanning ${range.name}: ${baseIP}.${range.start}-${range.end}`
			);

			for (let ip = range.start; ip <= range.end; ip++) {
				const fullIP = `${baseIP}.${ip}`;
				allPromises.push(
					this.testDeviceConnection(fullIP, 1000) // Faster 1 second timeout
						.then((result) => ({ ip: fullIP, result }))
						.catch(() => ({ ip: fullIP, result: null }))
				);
			}
		}

		// Execute all scans in parallel (limited concurrency)
		const batchSize = 50; // Scan 50 IPs at once to prevent overwhelming
		const allResults = [];

		for (let i = 0; i < allPromises.length; i += batchSize) {
			const batch = allPromises.slice(i, i + batchSize);
			const batchResults = await Promise.allSettled(batch);

			batchResults.forEach((settledResult) => {
				if (settledResult.status === "fulfilled") {
					allResults.push(settledResult.value);
				}
			});

			// Small delay between batches to prevent network congestion
			if (i + batchSize < allPromises.length) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		// Process results
		allResults.forEach(({ ip, result }) => {
			if (result && this.isIntelliRackDevice(result)) {
				console.log(`✅ Found IntelliRack device at ${ip}`);
				devices.push({
					...result,
					ipAddress: ip,
					discoveredVia: "Smart Network Scan",
					rackId: result.deviceId || result.rackId,
				});
			}
		});

		console.log(
			`📊 Network scan complete: ${devices.length} IntelliRack devices found`
		);
		return devices;
	}

	// Method 4: Broadcast Discovery (Lowest Priority)
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
