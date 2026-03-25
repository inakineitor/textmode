import { click } from "../../../../utils/sound/index.js";
import { boot } from "./screens.js";
import { stopSpeaking } from "./speak.js";
import { destroy } from "../text-animation/main.js";
import pause from "./pause.js";

/** Turn on the terminal */
async function on() {
	click();
	await power();
	boot();
}

/** Turn off the terminal */
function off() {
	click();
	stopSpeaking();
	destroy();
	power(false);
}

async function power(on = true) {
	// @FIXME use a single class on the #monitor to detect on/off
	const monitor = document.getElementById("monitor");
	document.querySelector("#slider").classList.toggle("on", on);
	document.querySelector("#switch").checked = !on;
	await pause(0.1);

	monitor.classList.toggle("turn-off", !on);
	monitor.classList.toggle("off", !on);
}

export { power, on, off };
