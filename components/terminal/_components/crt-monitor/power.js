import { click } from "../../../../utils/sound/index.js";
import { stopSpeaking } from "./speak.js";
import pause from "./pause.js";

/** @type {import('./screens.js').Screen} */
let screen = null;

export function setScreen(s) {
	screen = s;
}

/** Turn on the terminal */
async function on() {
	click();
	await power();
	screen.boot();
}

/** Turn off the terminal */
function off() {
	click();
	stopSpeaking();
	screen.shutdown();
	power(false);
}

async function power(on = true) {
	const monitor = document.getElementById("monitor");
	document.querySelector("#slider").classList.toggle("on", on);
	document.querySelector("#switch").checked = !on;
	await pause(0.1);

	monitor.classList.toggle("turn-off", !on);
	monitor.classList.toggle("off", !on);
}

export { power, on, off };
