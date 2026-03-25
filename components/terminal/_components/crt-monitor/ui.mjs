import { on, off } from "./power.js";
import { click } from "../../../../utils/sound/index.js";
import { setVolume } from "./speak.js";

/** @type {import('./screens.js').Screen} */
let screen = null;

export function setScreen(s) {
	screen = s;
}

function togglePower() {
	let isOff = document.getElementById("monitor").classList.contains("off");
	if (isOff) {
		on();
	} else {
		off();
	}
}

function fly(event) {
	event.target.classList.toggle("fly");
}

function handleClick(event) {
	if (event) {
		event.preventDefault();
	}
	let input = document.querySelector("[contenteditable='true']");
	if (input) {
		input.focus();
	}
}

function handleVolume(event) {
	let value = event.target.value;
	setVolume(value);
}

function theme(event, name) {
	click();
	[...document.getElementsByClassName("theme")].forEach((b) =>
		b.classList.toggle("active", false)
	);
	event.target.classList.add("active");
	document.body.classList = "theme-" + name;
	handleClick();
}

function fullscreen(event) {
	screen.toggleFullscreen();
	event.target.blur();
}

function globalListener({ keyCode }) {
	if (keyCode === 122) {
		// F11
		screen.toggleFullscreen();
	} else if (keyCode === 27) {
		// ESC
		screen.toggleFullscreen(false);
	}
}

export function registerHandlers() {
	document.addEventListener("keydown", globalListener);

	// Theme
	document.getElementById('theme-red').addEventListener('click', (e) => theme(e, 'red'));
	document.getElementById('theme-green').addEventListener('click', (e) => theme(e, 'green'));
	document.getElementById('theme-blue').addEventListener('click', (e) => theme(e, 'blue'));

	// Power
	document.getElementById('switch').addEventListener('click', togglePower);
	document.getElementById('slider').addEventListener('click', togglePower);

	// Other UI
	document.getElementById('fullscreen').addEventListener('click', fullscreen);
	document.getElementById('crt').addEventListener('click', handleClick);
	document.getElementById('sticky').addEventListener('click', fly);
	document.getElementById("dial").addEventListener("input", handleVolume);
}
