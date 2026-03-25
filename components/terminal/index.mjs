import { Screen } from "./_components/crt-monitor/screens.js";
import { registerHandlers, setScreen as setScreenUI } from "./_components/crt-monitor/ui.mjs";
import { setScreen as setScreenPower } from "./_components/crt-monitor/power.js";

async function onLoad() {
	const urlParams = new URLSearchParams(window.location.search);
	const fullscreen = urlParams.get("fullscreen");

	const screen = new Screen();

	// Wire the screen instance into modules that need it
	setScreenUI(screen);
	setScreenPower(screen);

	const { on } = await import("./_components/crt-monitor/power.js");

	registerHandlers();

	if (fullscreen) {
		screen.toggleFullscreen(true);
	}

	on();
}

window.addEventListener("load", onLoad);
