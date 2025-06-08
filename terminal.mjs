import { toggleFullscreen } from "./components/crt-monitor/screens.js";
import { registerHandlers } from "./components/crt-monitor/ui.mjs";

async function onLoad() {
	// Check for query parameters in the URL, e.g. ?command=help&fullscreen=1
	const urlParams = new URLSearchParams(window.location.search);
	const fullscreen = urlParams.get("fullscreen");
	const { on } = await import("./components/crt-monitor/power.js");

	// Set up click event handlers for UI buttons
	registerHandlers();

	if (fullscreen) {
		toggleFullscreen(true);
	}

	on();
}

window.addEventListener("load", onLoad);
