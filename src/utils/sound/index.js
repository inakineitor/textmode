let buttonSound = new Audio("./static/sound/button.mp3");
let clickSound = new Audio("./static/sound/click.mp3");

let keys = [
	new Audio("./static/sound/key1.mp3"),
	new Audio("./static/sound/key2.mp3"),
	new Audio("./static/sound/key3.mp3"),
	new Audio("./static/sound/key4.mp3")
];

function button() {
	buttonSound.play();
}

function click() {
	clickSound.play();
}

function typeSound() {
	let i = Math.floor(Math.random() * keys.length);
	keys[i].currentTime = 0;
	keys[i].play();
}

export { button, click, typeSound };
