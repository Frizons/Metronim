const socket = io('https://agile-chamber-43949.herokuapp.com/');

//Connecte les evenements envoyer par le serveur au fonction frontend

socket.on('init', handleInit);
socket.on('gameState', handleGameState); // Sert uniquement dans le lobby a update les pseudos / skins des joueurs
socket.on('updatePoints', handlePoints);
socket.on('explode', handleExplosion);
socket.on('endGame', handleEndGame);
socket.on('gameCode', handleGameCode);
socket.on('unknownGame', handleUnknownGame);
socket.on('tooManyPlayers', handletooManyPlayers);
socket.on('gameAlreadyStart', handleGameAlreadyStart);
socket.on('runGame', initGame);

//Event relative to trains specifications


//recupere les references des elements html

const gameScreen = document.getElementById('gameScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const initialScreen = document.getElementById('initialScreen');
const resultScreen = document.getElementById('resultScreen');

const newGameBtn = document.getElementById('newGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const startGameBtn = document.getElementById('startBtn');
const gameNameInput = document.getElementById('gameNameInput');
const gameCodeInput = document.getElementById('gameCodeInput');

const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const waitGameDisplay = document.getElementById('waitGameToStart');

const firstChoice = document.getElementById('firstChoice');
const secondChoice = document.getElementById('secondChoice');
const thirdChoice = document.getElementById('thirdChoice');
const fourthChoice = document.getElementById('fourthChoice');

const creditDisplay = document.getElementById('creditDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');

const frontGauge = document.getElementById('frontGauge');

const changeWayButton = document.getElementById('changeWayButton');
const launchTrainButton = document.getElementById('launchTrainButton');

const descContainer = document.getElementById('descContainer');
const descTitle = document.getElementById('descTitle');
const descContent = document.getElementById('descContent');


let shopPerso = [];

//connecte les elements html a leur signaux

firstChoice.addEventListener('mouseover', showAdvice.bind(null, 0));
secondChoice.addEventListener('mouseover', showAdvice.bind(null, 1));
thirdChoice.addEventListener('mouseover', showAdvice.bind(null, 2));
fourthChoice.addEventListener('mouseover', showAdvice.bind(null, 3));

firstChoice.addEventListener('mouseout', () => descContainer.style.display = "none");
secondChoice.addEventListener('mouseout', () => descContainer.style.display = "none");
thirdChoice.addEventListener('mouseout', () => descContainer.style.display = "none");
fourthChoice.addEventListener('mouseout', () => descContainer.style.display = "none");

firstChoice.addEventListener('mousedown', selectTrain.bind(null, 0));
secondChoice.addEventListener('mousedown', selectTrain.bind(null, 1));
thirdChoice.addEventListener('mousedown', selectTrain.bind(null, 2));
fourthChoice.addEventListener('mousedown', selectTrain.bind(null, 3));
newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', () => {
	socket.emit('startGame', roomCode);
});

//si create pressed alors initialise le canvas et envoie le message au backend
function newGame() {
	const pseudo = gameNameInput.value;
	const skin = 0;
	if (pseudo !== "") {
		save(pseudo);
		socket.emit('newGame', pseudo, skin);
		initLobby();
	}
}

var storedItem = localStorage.getItem("storedItem");

//Permet de sauvegarder le pseudo
function save(item){
	localStorage.setItem("storedItem", item);
}

//Permet de prendre le pseudo dans la mémoire local
function get(){
	localStorage.getItem("storedItem");
	gameNameInput.value = storedItem;
}

//si join pressed alors initialise le canvas et envoie le code saisie au backend
function joinGame() {
	const pseudo = gameNameInput.value;
	const skin = 0;
	const code = gameCodeInput.value;
	if (code !== "" && pseudo !== "") {
		save(pseudo);
		socket.emit('joinGame', code, pseudo, skin);
		initLobby();
	}
}

let canvas, ctx; // ref du canvas et du contexte

let playerNumber; // id personnel (dans l'ordre des venue)

let roomCode; // code de la room rejoins

let baseOrder = []; // ordre des joueurs apres le debut de la partie
let credits = 50; // credits personnels
let leftLink = []; // liste du lien de gauche
let rightLink = []; // liste du lien de droite

let trainSelected = -1;  // le train selectionné dans la boutique
let waySelected = false;  // le chemin selectionné
let stillPressing = false; // verifie si on appuie toujours sur espace
let fireProgress = 1.0; // valeur de la gauge d'envoi
let exploData = [];

//Initialise le canvas
function initLobby() {
	initialScreen.style.display = 'none';
	lobbyScreen.style.display = "block";
	
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	
	canvas.height = 900;
	canvas.width = 1900;
	
	document.addEventListener('keydown', keydown);
	document.addEventListener('keyup', keyup);
}

//Initialise les variable d'ordre et crée les bouttons
function initGame(newOrder, listLeftLink, listRightLink, shop) {
	
	//Assigne le nouvel ordre pour le notifier a l'afficheur canvas
	baseOrder = newOrder;
	
	//représente le lien qui permettait de recevoir dans les ancinnes versions
	leftLink = listLeftLink;
	rightLink = listRightLink;
	
	//Change d'ecran pour le GameScreen
	lobbyScreen.style.display = 'none';
	gameScreen.style.display = 'block';
	
	shopPerso = shop;
	
	initiateShop(shop);
}

function initiateShop(shop){
	
	listChoice = [firstChoice, secondChoice, thirdChoice, fourthChoice];
	listPrice = [firstPrice, secondPrice, thirdPrice, fourthPrice];
	
	for(i = 0; i < shop.length; i++){
		
		listPrice[i].innerHTML = shop[i]["cost"];
		
		// a l'avenir remplacer par des img et donc plus de switch
		const img = document.createElement("img");
		listChoice[i].appendChild(img);
		img.src = "ressources/logo_train/" + shop[i]["name"] + ".png";
		img.className = "logoTrain";
		
	}
	
}

let pushHelp = 0;
function selectTrain(act){
	pushHelp += 1;
	
	if (shopPerso.length ==0) return;
	
	if (pushHelp == 5){
		showAdvice(act)
	}
	
	const baseColor = ["#A88070", "#AD6547", "#CC322C", "#CC322C"];
	const modifiedColors = ["#7F6155", "#844D37", "#A52824", "#A52824"];
	const selectColor = 'white';
	
	trainSelected = act;
	
	firstChoice.style.backgroundColor = baseColor[0];
	secondChoice.style.backgroundColor = baseColor[1];
	thirdChoice.style.backgroundColor = baseColor[2];
	fourthChoice.style.backgroundColor = baseColor[3];
	firstChoice.style.borderColor = "transparent";
	secondChoice.style.borderColor = "transparent";
	thirdChoice.style.borderColor = "transparent";
	fourthChoice.style.borderColor = "transparent";
	
	switch(trainSelected){
		case 0:
			firstChoice.style.backgroundColor = modifiedColors[0];
			firstChoice.style.borderColor = selectColor;
			break;
		case 1:
			secondChoice.style.backgroundColor = modifiedColors[1];
			secondChoice.style.borderColor = selectColor;
			break;
		case 2:
			thirdChoice.style.backgroundColor = modifiedColors[2];
			thirdChoice.style.borderColor = selectColor;
			break;
		case 3:
			fourthChoice.style.backgroundColor = modifiedColors[3];
			fourthChoice.style.borderColor = selectColor;
			break;
		case 4:
			trainSelected = -1;
			break;
	}
	
	document.getElementById('descTitle').innerHTML = shopPerso[act]["name"];
	document.getElementById('descContent').innerHTML = shopPerso[act]["desc"];
}

function showAdvice(act){
	if (shopPerso.length == 0) return;
	
	descTitle.innerHTML = shopPerso[act]["name"];
	descContent.innerHTML = shopPerso[act]["desc"];
	descContainer.style.left = (690 + act * 75).toString() + "px";
	descContainer.style.display = "block";
}

function keyup(e){
	const cod = e.keyCode;
	pushHelp = 0;
	descContainer.style.display = "none";
	if (cod == 32) stillPressing = false;
}

function keydown(e){
	const cod = e.keyCode;
	const actionSel = cod == 65 ? 0 : cod == 90 ? 1 : cod == 69 ? 2 : cod == 82 ? 3 : cod == 84 ? 4 : -1;
	
	if (cod == 13){
		waySelected = !waySelected;
	}
	
	if (cod == 32 && baseOrder.length > 0){
		if (trainSelected == -1 || stillPressing || credits < shopPerso[trainSelected]["cost"]) return;
		
		launchTrain();
		
		stillPressing = true;
		
		
	}
	
if (actionSel == -1 || stillPressing || baseOrder.length == 0) return;
	
	selectTrain(actionSel);
}

function launchTrain(){
	var barInterval = setInterval(updateLaunchBar, 30);
	
	function updateLaunchBar(){
		if (stillPressing && fireProgress > 0.0){
			const reverseProgress = fireProgress * -1 + 1;
			frontGauge.style.width = (reverseProgress * 100).toString() + "%";
			fireProgress -= 0.03;
		}else{
			socket.emit('spawnTrain', roomCode, waySelected, shopPerso[trainSelected]["name"], playerNumber, fireProgress);
			fireProgress = 1.0;
			const reverseProgress = fireProgress * -1 + 1;
			frontGauge.style.width = (reverseProgress * 100).toString() + "%";
			clearInterval(barInterval);
			selectTrain(4);
		}
	}
}

function handlePoints(newPoints){
	credits = newPoints;
	creditDisplay.innerHTML = newPoints;
}

function handleExplosion(dmg, posX, posY){
	exploData.push([dmg*5, posX, posY, 0.0]);
}

//Met a jour le canvas, et le html selon le gamestate
function paintGame(state){
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	switch (state["phase"]) {
		default: //LOBBY, GAME
			drawGame(state);
			break;
		case 2: //RESULT
			// Do Something
			break;
	}
}

let playerPos = [];

//Affichage des CPU dans la phase de jeu
function drawGame(state){
	
	//Recupere le nombre de joueurs
	const playerMany = state["players"].length;
	
	//Calibre l'affichage selon le nombre de joueurs
	let decay = 200 * (playerMany-1)/2;
	decay = canvas.width/2 - decay;
	
	const playersTop = Math.ceil(playerMany/2);
	
	playerPos = [];
	
	//Calculate player positions
	for (i = 0; i < playerMany; i++){
		
		const ind = baseOrder.length > 0 ? baseOrder[i] : i;
		
		let curNodeX = 0;
		let curNodeY = 285;
		
		for(p = 1; p < ind+1; p++){
			if (p < playersTop){
				curNodeX += 400;
			}else{
				curNodeY = 631;
				curNodeX += ind == 1 ? 200 : playerMany % 2 == 0 && p == playersTop ? 200 : p == playersTop ? -200 : -400;
			}
		}
		curNodeX += decay;
		
		playerPos.push([curNodeX, curNodeY]);
	}
	
	// Draw the link between each player
	for (i = 0; i < playerMany; i++){
		drawDownLink(state, playerMany, i);
	}
	
	// Draw the train traveling between two nodes
	for (i = 0; i < state["trainOnRail"].length; i++){
		drawTrain(state, playerPos, i);
	}
	
	// Draw the link between and above each player
	for (i = 0; i < playerMany; i++){
		drawUpLink(state, playerMany, i);
	}
	
	//Draw an indicator of the way selected
	for (i = 0; i < playerMany; i++) {
		if (playerNumber === i){
			
			let receiveId = leftLink.length > 0 ? waySelected ? leftLink[i] : rightLink[i] : i+1 == playerMany ? 0 : i+1;
			
			const nodeDiffX = playerPos[receiveId][0] - playerPos[i][0]; // Uncaught TypeError: Cannot read property '0' of undefined
			const nodeDiffY = playerPos[receiveId][1] - playerPos[i][1];
			
			const posX = playerPos[i][0] + nodeDiffX * 0.3;
			const posY = playerPos[i][1] + nodeDiffY * 0.3;
			
			ctx.save();
			
			const img = document.getElementById("arrow_ind");
			const imgSize = [25, 30] // ratio 1.2
			
			ctx.translate(posX, posY);
			
			const waySel = baseOrder.length > 0 ? waySelected ? baseOrder[i] - 1 == -1 ? playerMany-1 : baseOrder[i]-1: baseOrder[i] : waySelected ? i - 1 == -1 ? playerMany-1 : i-1: i;
			
			ctx.rotate((getRotationByWay(state, waySel, waySelected) + 90)*(Math.PI/180));
			
			ctx.drawImage(img, -imgSize[0]/2, -imgSize[1]/2, imgSize[0], imgSize[1]);
			
			ctx.restore();
			
		}
	}
	
	//Draw each station
	for (i = 0; i < playerMany; i++) {
		drawStation(state, playerPos[i][0], playerPos[i][1], 84, i);
		drawHealthBar(playerPos[i][0], playerPos[i][1], state["players"][i]["health"]);
	}
	
	//Draw each explosions
	for (e = 0; e < exploData.length; e++) {
		drawExplosion(exploData[e][0], exploData[e][1], exploData[e][2], e);
	}
	
}

function drawDownLink(state, playerMany, i){
	const secondI = rightLink.length > 0 ? rightLink[i] : i+1 == playerMany ? 0 : i+1;
	
	if (playerPos.length == secondI) return; // TOUJOURS UN PROBLEME A 5 sur le client 2 mais c'est un probleme d'inatention de la fenetre donc oklm en vrai
	if (playerMany == 1)return;
	
	const smaller = playerPos[i][0] < playerPos[secondI][0] ? playerPos[i] : playerPos[secondI];
	const higher = playerPos[i][0] > playerPos[secondI][0] ? playerPos[i] : playerPos[secondI];
	
	const interPosX = smaller[0] + (higher[0] - smaller[0])/2;
	const interPosY = smaller[1] + (higher[1] - smaller[1])/2;
	
	ctx.save();
	
	ctx.translate(interPosX, interPosY);
	
	ctx.rotate((getRotationByWay(state, baseOrder.length > 0 ? baseOrder[i] : i, false)+90)*(Math.PI/180));
	
	const tunelSize = [40, 400];
	
	const imgDown = document.getElementById("tunel_down");
	
	ctx.drawImage(imgDown, -tunelSize[0]/2, -tunelSize[1]/2, tunelSize[0], tunelSize[1]);
	
	ctx.restore();
	
}

function drawTrain(state, playerPos, i){
	const theWay = state["trainOnRail"][i]["way"]; // Telle est la voie
	
	let sendId = state["trainOnRail"][i]["senderUpdate"];
	
	let receiveId = theWay ? leftLink[sendId] : rightLink[sendId];
	
	const trainProgress = state["trainOnRail"][i]["progress"];
	
	ctx.strokeStyle = '#E5BDBC';
	
	const nodeDiffX = playerPos[receiveId][0] - playerPos[sendId][0];
	const nodeDiffY = playerPos[receiveId][1] - playerPos[sendId][1];
	
	const trainForDraw = document.getElementById("train_01");
	ctx.save();
	
	ctx.translate(playerPos[sendId][0] + nodeDiffX * trainProgress, playerPos[sendId][1] + nodeDiffY * trainProgress);
	
	const baseRot = getRotationByWay(state, state["trainOnRail"][i]["finalWay"], state["trainOnRail"][i]["way"])+90;
	
	ctx.rotate(baseRot*(Math.PI/180));
	
	const trainSize = [18, 60]; // ratio 0.3
	
	ctx.drawImage(trainForDraw, -trainSize[0]/2, -trainSize[1]/2, trainSize[0], trainSize[1]); 
	
	ctx.restore();
}

function drawUpLink(state, playerMany, i){
	const secondI = rightLink.length > 0 ? rightLink[i] : i+1 == playerMany ? 0 : i+1;
	
	if (playerPos.length == secondI) return; 
	if (playerMany == 1)return;
	
	const smaller = playerPos[i][0] < playerPos[secondI][0] ? playerPos[i] : playerPos[secondI];
	const higher = playerPos[i][0] > playerPos[secondI][0] ? playerPos[i] : playerPos[secondI];
	
	const interPosX = smaller[0] + (higher[0] - smaller[0])/2;
	const interPosY = smaller[1] + (higher[1] - smaller[1])/2;
	
	ctx.save();
	
	ctx.translate(interPosX, interPosY);
	
	const addRot = secondI == playerNumber ? 180 : 0;
	
	ctx.rotate((getRotationByWay(state, baseOrder.length > 0 ? baseOrder[i] : i, false)+90+addRot)*(Math.PI/180));
	
	const tunelSize = [40, 400];
	
	const imgUp = i == playerNumber || secondI == playerNumber ? document.getElementById("tunel_up_half") : document.getElementById("tunel_up");
	
	ctx.drawImage(imgUp, -tunelSize[0]/2, -tunelSize[1]/2, tunelSize[0], tunelSize[1]);
	
	ctx.restore();
	
}

function drawHealthBar(posX, posY, val){
	
	ctx.fillStyle = '#111111';
	ctx.fillRect(posX-35, posY-10-65, 70, 20);
	
	ctx.fillStyle = '#962B2B';
	ctx.fillRect(posX-33, posY-8-65, 66 * (val/100), 16);
	
	ctx.font = "11pt Montserrat,Geneva,Arial";
	ctx.fillStyle = '#222222';
	ctx.textAlign = "center";
	
	ctx.fillText(val, posX, posY+5-65);
}

function drawExplosion(auraSize, posX, posY, e){
	
	if (exploData[e][3] > auraSize){
		exploData.splice(e, 1);
		return;
	}
	
	exploData[e][3] += auraSize*0.04;
	
	//Creating the first Aura
	ctx.beginPath();
	ctx.arc(posX, posY, auraSize, 0, 2 * Math.PI, false);
	ctx.fillStyle = '#D8491190';
	ctx.fill();
	ctx.closePath();
	
	//Creating the second Aura
	ctx.beginPath();
	ctx.fillStyle = '#D8491190';
	ctx.arc(posX, posY, exploData[e][3], 0, 2 * Math.PI, false);
	ctx.fill();
	ctx.closePath();
	
	//Creating some particle around
	ctx.fillStyle = '#D8491190';
	
	const rangeAround = auraSize;
	
	if (auraSize > 50){
		for (i = 0; i < 4; i++){
			ctx.beginPath();
			ctx.arc(Math.random() * (posX+rangeAround - (posX-rangeAround)) + posX-rangeAround, Math.random() * (posY+rangeAround - (posY-rangeAround)) + posY-rangeAround, exploData[e][3]*0.3, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.closePath();
		}
	}
}

function drawStation(state, indx, indy, s_cpu, ind){
	
	const stationDraw = document.getElementById("station");
	
	ctx.drawImage(stationDraw, indx - s_cpu/2, indy - s_cpu/2, s_cpu, s_cpu);
	
	ctx.fillStyle = '#999999';
	ctx.textAlign = "center";
	
	ctx.font = "8pt Montserrat,Geneva,Arial";
	ctx.fillText(state["players"][ind]["pseudo"], indx, indy-15-65);
}

function getRotationByWay(state, way, sens){
	let result = 0;
	
	const playerMany = state["players"].length;
	
	const playersTop = Math.ceil(playerMany/2);
	
	if(way == playersTop-1){
		result = playerMany % 2 * 60 + 60;
	}else if(way == playerMany-1){
		result = -120;
	}else if(way > playersTop-1){
		result = 180;
	}
	
	result += sens ? 180 : 0;
	
	return result;
}

//Initialise des variable au moments de la connexion et affiche le lobby
function handleInit(numberP, state) {
	playerNumber = numberP;
	if (playerNumber === 0){
		startGameBtn.style.display = 'block';
	} else {
		waitGameDisplay.style.display = 'block';
		waitGameDisplay.innerHTML = "Waiting " + state["players"][0]["pseudo"] + " to start...";
	}
}

//Avertis quand le timer s'arrete
function handleEndGame() {
	gameScreen.style.display = 'none';
	resultScreen.style.display = 'block';
}

//Recupere le gamestate du serveur et demande un rafraichissement du canvas
function handleGameState(gameState) {
	gameState = JSON.parse(gameState);
	
	window.requestAnimationFrame(() => paintGame(gameState));
}

//Recuper le code de la game pour les clients qui join
function handleGameCode(gameCode) {
	roomCode = gameCode;
	gameCodeDisplay.innerText = gameCode;
}

//Check les erreurs
function handleUnknownGame() {
	reset();
	alert("Unknown game code");
}

function handletooManyPlayers() {
	reset();
	alert("This room is full");
}

function handleGameAlreadyStart(){
	reset();
	alert("This game has already start");
}

//reset les parametre pour pouvoir rejoindre une nouvelle partie
function reset() {
	playerNumber = null;
	gameCodeInput.value = "";
	gameCodeDisplay.innerText = "";
	initialScreen.style.display = "block";
	lobbyScreen.style.display = "none";
	gameScreen.style.display = "none";
}
