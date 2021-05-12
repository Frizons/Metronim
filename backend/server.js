const { initGame , addPrivatePlayer, addPublicPlayer, addStatsPlayer, trainIdByName, getAllTrainPos, getTrainPos, computePlayerPos } = require('./game');
const { TICK_RATE , MAX_PLAYERS, TRAIN_SPEED, TRAIN_TYPE, EXP_MULTI } = require('./constants');
const { makeid } = require('./utils');

const state = {}; //state représente la version original du Status de la game, il est envoyer au client souvent
const secretState = {};
const statistics = {};

const io = require("socket.io")({
  cors: {
    origin: "*",
  }
});

io.on('connection', client => {
	
	client.on('newGame', handleNewGame);
	client.on('joinGame', handleJoinGame);
	client.on('startGame', handleStartGame);
	client.on('spawnTrain', handleSpawnTrain);
	client.on('userDisconnect', handleDisconnect);
	
	function handleNewGame(pseudo, skinChosen){
		
		console.log(pseudo + " has created a new server !");
		
		let roomName = makeid(4);
		
		//Donne le code a tout les clients
		client.emit('gameCode', roomName);
		
		//Initialise un gameState dans la room
		var combine = initGame();
		state[roomName] = combine[0];
		secretState[roomName] = combine[1];
		statistics[roomName] = combine[2];
		
		//Join la room et met a jour le nombre de clients
		client.join(roomName);
		client.number = 0;
		
		//Met a jour le public et le private State en ajoutant un joueur
		state[roomName] = addPublicPlayer(state[roomName], pseudo, skinChosen);
		
		//envoi un message de confirmation au clients
		client.emit('init', 0, state[roomName]);
		
		//Envoi la mise a jour du state au clients
		emitGameState(roomName, state[roomName]);
	}
	
	function handleJoinGame(roomName, pseudo, skinChosen) {
		const allUsers = io.sockets.adapter.rooms.get(roomName);
		
		let numClients = 0;
		if (allUsers){
			numClients = allUsers.size;
		}
		
		//Verifie l'eligibiliter a rentrer
		if (numClients === 0){
			client.emit('unknownGame');
			return;
		} else if (numClients > MAX_PLAYERS - 1) {
			client.emit('tooManyPlayers');
			return;
		} else if (state[roomName]["phase"] > 0){
			client.emit('gameAlreadyStart');
			return;
		}
		
		//Donne le code a tout les clients
		client.emit('gameCode', roomName);
		
		//Join la room et met a jour le nombre de clients
		client.join(roomName);
		client.number = numClients;
		
		//Met a jour le public et le private State en ajoutant un joueur
		state[roomName] = addPublicPlayer(state[roomName], pseudo, skinChosen);
		
		//envoi un message de confirmation au clients
		client.emit('init', numClients, state[roomName]);
		
		//Envoi la mise a jour du state au clients
		emitGameState(roomName, state[roomName]);
		
	}
	
	function handleStartGame(roomName){
		const allUsers = io.sockets.adapter.rooms.get(roomName);
		let allUserIDs = [];
		
		if (allUsers){
			for (let i of allUsers){
				allUserIDs.push(i);
			} 
		}
		
		let mirrorIDS = [];
		
		//Cree une liste de places de joueurs
		for(i = 0; i<allUserIDs.length;i++){
			mirrorIDS.push(i);
		}
		
		let finalOrder = [];
		
		//Assigne au joueurs aléatoirement une place contenu dans mirrorIDS
		for(i = 0; i<allUserIDs.length;i++){
			const randID = Math.ceil(Math.random()*mirrorIDS.length)-1;
			finalOrder.push(mirrorIDS[randID]);
			mirrorIDS.splice(randID, 1);
		}
		
		//Assigne le nouvel ordre
		secretState[roomName]["order"] = finalOrder;
		
		//Cree une liste pour les deux liens
		let listLeftLink = [];
		for (i = 0; i < finalOrder.length;i++){
			const receiverID = finalOrder[i]-1 < 0 ? finalOrder.length-1 : finalOrder[i]-1;
			
			listLeftLink.push(finalOrder.indexOf(receiverID))
		}
		secretState[roomName]["leftLink"] = listLeftLink;
		
		let listRightLink = [];
		for (i = 0; i < finalOrder.length;i++){
			const receiverID = finalOrder[i]+1 >= finalOrder.length ? 0 : finalOrder[i]+1;
			
			listRightLink.push(finalOrder.indexOf(receiverID))
		}
		secretState[roomName]["rightLink"] = listRightLink;
		
		for (f = 0; f<allUserIDs.length;f++){
			secretState[roomName] = addPrivatePlayer(secretState[roomName], allUserIDs.length);
			statistics[roomName] = addStatsPlayer(statistics[roomName]);
		}
		
		//Envoie son mot a chaque joueurs
		for (i = 0; i<allUserIDs.length;i++){
			io.to(allUserIDs[i]).emit('runGame', finalOrder, listLeftLink, listRightLink, secretState[roomName]["players"][i]["shop"]);
		}
		
		//Met a jour la phase
		state[roomName]["phase"] = 1;
		emitGameState(roomName, state[roomName])
		
		//Demmare la logique de jeu
		startGameInterval(roomName);
	}
	
	function handleSpawnTrain(roomName, linkId, trainName, playerId, trainSpeed){
		let trainId = trainIdByName(trainName);
		let trainCost = state[roomName]["trainSheet"][trainId]["cost"];
		let trainDmg = state[roomName]["trainSheet"][trainId]["dmg"];
		
		let newTrainSpeed = trainSpeed;
		
		if (trainName == "Express") newTrainSpeed = 3;
		
		if (state[roomName]["players"][playerId]["dirtyTrain"] > 0){
			if (trainName == "Express") state[roomName]["trainSheet"][trainId]["dmg"] = 0;
			newTrainSpeed = -3;
			state[roomName]["players"][playerId]["dirtyTrain"] -= 1;
		}
		
		if (secretState[roomName]["players"][playerId]["credits"] < trainCost) return;
		
		statistics[roomName]["trainSpawn"] += 1;
		
		statistics[roomName]["players"][playerId]["creditsSpend"] += trainCost;
		
		addPoints(roomName, playerId, -trainCost);
		
		const playerMany = state[roomName]["players"].length;
		
		const playerOrd = secretState[roomName]["order"][playerId];
		
		let compileWay = linkId ? playerOrd-1 == -1 ? playerMany-1 : playerOrd-1 : playerOrd;
		
		state[roomName]["trainOnRail"].push({name : trainName, progress : 0.0, speed : newTrainSpeed, sender : playerId, way : linkId, finalWay : compileWay, dmg : trainDmg, senderUpdate : playerId, colTaken : 0, stationPassed : 0});
		
	}
	
	function handleDisconnect(roomName){
		const thatRoom = io.sockets.adapter.rooms.get(roomName);
		
		if (!thatRoom) return;
		
		if (thatRoom.size == 2){
			state[roomName] = null;
			secretState[roomName] = null;
			statistics[roomName] = null;
		}
	}
});

function returnToMenu(){
	
}

function creditsDistrib(roomName){
	state[roomName]["count"] += 1;
	if (state[roomName]["count"] >= 90){
		statistics[roomName]["gameDuration"] += 3;
		state[roomName]["count"] = 0;
		for (p = 0; p < state[roomName]["players"].length; p++){
			if (state[roomName]["players"][p]["health"] != 0) addPoints(roomName, p, 1);
		}
	}
}

function addPoints(roomName, playerId, howMany){ // If you wan't to remove points, just set howMany to a negative number
	
	const allUsers = io.sockets.adapter.rooms.get(roomName);
	let allUserIDs = [];
	
	if (allUsers){
		for (let i of allUsers){
			allUserIDs.push(i);
		}
	}
	
	let newPoints = secretState[roomName]["players"][playerId]["credits"];
	
	newPoints += howMany;
	
	secretState[roomName]["players"][playerId]["credits"] = newPoints;
	
	io.to(allUserIDs[playerId]).emit("updatePoints" , newPoints);
}

function startGameInterval(roomName) {
	const intervalId = setInterval(() => {
		
		if (!state[roomName]) {
			clearInterval(intervalId);
			return;
		}
		
		updateTrain(roomName);
		
		creditsDistrib(roomName);
		
		emitGameState(roomName, state[roomName]);
		
	}, 1000 / TICK_RATE);
}

function updateTrain(roomName){
	
	for (id = 0; id < state[roomName]["trainOnRail"].length; id++){
		if (state[roomName]["trainOnRail"][id]["progress"] > 1.0){
			
			arriveSafely(roomName, state[roomName]["trainOnRail"][id], id);
			
		}else{
			if (state[roomName]["trainOnRail"][id]["name"] == "Peaceful" && state[roomName]["trainOnRail"][id]["progress"] > 0.5)continue;
			const forceSpeed = state[roomName]["trainOnRail"][id]["speed"] * 2;
			
			state[roomName]["trainOnRail"][id]["progress"] += 1 / TICK_RATE / (TRAIN_SPEED - forceSpeed);
		}
		
		const mainTrain = state[roomName]["trainOnRail"][id];
		
		for (comp = 0; comp < state[roomName]["trainOnRail"].length; comp++){
			
			if (comp == id) break;
			
			const checkTrain = state[roomName]["trainOnRail"][comp];
			
			if(!mainTrain || !checkTrain)return;
			
			if(mainTrain["finalWay"] == checkTrain["finalWay"]){
				
				let mainProgress = mainTrain["progress"] + 0.07;
				
				let checkProgress = checkTrain["senderUpdate"] == mainTrain["senderUpdate"] ? checkTrain["progress"]-0.07 : (checkTrain["progress"] + 0.07) * -1 + 1;
				
				if (mainProgress > checkProgress && mainProgress < checkProgress + 0.07){
					trainCollide(roomName, mainTrain, checkTrain, id, comp);
					return;
				}
			}
		}
	
	}
}

function trainCollide(roomName, train1, train2, id1, id2){
	
	const epicenterPos = getTrainPos(state[roomName], train1, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
	
	let additionalDamage = state[roomName]["trainOnRail"][id1]["dmg"] + state[roomName]["trainOnRail"][id2]["dmg"];
	
	const sender1 = train1["sender"];
	const sender2 = train2["sender"];
	
	statistics[roomName]["players"][sender1]["trainCollision"] += 1;
	
	if (sender1 != sender2){
		statistics[roomName]["players"][sender2]["trainCollision"] += 1;
	}
	
	if (train1["name"] == "Train Thief" && train2["name"] == "Train Thief"){
		state[roomName]["trainOnRail"].splice(id1, 1);
		state[roomName]["trainOnRail"].splice(id2, 1);
		
		explode(roomName, epicenterPos[0], epicenterPos[1], 10 + additionalDamage, sender1, sender2, mineNum);
		return;
	}
	
	if (train1["name"] == "Train Thief"){
		train2["way"] = !JSON.parse(JSON.stringify(train2["way"]));
		train2["sender"] = JSON.parse(JSON.stringify(train1["sender"]));
		train2["senderUpdate"] = JSON.parse(JSON.stringify(train1["senderUpdate"]));
		train2["progress"] = (JSON.parse(JSON.stringify(train2["progress"])) - 1) * -1
		
		train1["progress"] -= 0.07;
		
		const trainPos1 = getTrainPos(state[roomName], train1, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
		
		train1["progress"] += 0.14;
		
		const trainPos2 = getTrainPos(state[roomName], train1, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
		
		io.in(roomName).emit('fusionTrain', trainPos1[0], trainPos1[1], trainPos2[0], trainPos2[1], train2["finalWay"], train2["way"]);
		
		state[roomName]["trainOnRail"].splice(id1, 1);
		return;
	}
	
	if (train2["name"] == "Train Thief"){
		train1["way"] = !JSON.parse(JSON.stringify(train1["way"]));
		train1["sender"] = JSON.parse(JSON.stringify(train2["sender"]));
		train1["senderUpdate"] = JSON.parse(JSON.stringify(train2["senderUpdate"]));
		train1["progress"] = (JSON.parse(JSON.stringify(train1["progress"])) - 1) * -1 - 0.07
		
		train2["progress"] -= 0.07;
		
		const trainPos1 = getTrainPos(state[roomName], train2, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
		
		train2["progress"] += 0.14;
		
		const trainPos2 = getTrainPos(state[roomName], train2, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
		
		io.in(roomName).emit('fusionTrain', trainPos1[0], trainPos1[1], trainPos2[0], trainPos2[1], train2["finalWay"], train2["way"]);
		
		state[roomName]["trainOnRail"].splice(id2, 1);
		return;
	}
	
	if (train1["name"] == "Roadhog" && train2["name"] == "Roadhog"){
		additionalDamage += 10;
		state[roomName]["trainOnRail"].splice(id1, 1);
		state[roomName]["trainOnRail"].splice(id2, 1);
		
		explode(roomName, epicenterPos[0], epicenterPos[1], 10 + additionalDamage, sender1, sender2);
		return;
	}
	
	if (train1["name"] == "Roadhog"){
		if(train1["colTaken"] == 0){
			train1["colTaken"] += 1;
			
			train2["progress"] -= 0.07;
			
			const trainPos = getTrainPos(state[roomName], train2, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
		
			io.in(roomName).emit('firedTrain', state[roomName]['trainSheet'][trainIdByName(train2["name"])]["type"], trainPos[0], trainPos[1], train2["finalWay"], train2["way"]);
			
			state[roomName]["trainOnRail"].splice(id2, 1);
			return;
		}
	}
	
	if (train2["name"] == "Roadhog"){
		if(train2["colTaken"] == 0){
			train2["colTaken"] += 1;
			
			train1["progress"] -= 0.07;
			
			const trainPos = getTrainPos(state[roomName], train1, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
		
			io.in(roomName).emit('firedTrain', state[roomName]['trainSheet'][trainIdByName(train1["name"])]["type"], trainPos[0], trainPos[1], train1["finalWay"], train1["way"]);
			
			state[roomName]["trainOnRail"].splice(id1, 1);
			return;
		}
	}
	
	let mineNum = 0;
	
	if (train1["name"] == "Mine Setter") mineNum += 1;
	if (train2["name"] == "Mine Setter") mineNum += 1;
	
	state[roomName]["trainOnRail"].splice(id1, 1);
	state[roomName]["trainOnRail"].splice(id2, 1);
	
	explode(roomName, epicenterPos[0], epicenterPos[1], 10 + additionalDamage, sender1, sender2, mineNum, null);
	
}

function explode(roomName, posX, posY, dmg, sender1, sender2, spawnMine, nameWhenArrive){
	
	let allTrainPos = getAllTrainPos(state[roomName], secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
	
	//Check explosion avec d'autre train
	for (i = 0; i < allTrainPos.length; i++){
		
		const trainDiffX = allTrainPos[i][0] - posX;
		const trainDiffY = allTrainPos[i][1] - posY;
		
		const distance = Math.sqrt(trainDiffX ** 2 + trainDiffY ** 2);
		
		if (distance < dmg*EXP_MULTI + 25){
			setTimeout(chainExplosion, 250, roomName, allTrainPos[i][0], allTrainPos[i][1]);
			allTrainPos.splice(0, 1); //A VOIR PEUT ETRE A ENLEVER
		}
	}
	
	//Check explosion avec mines
	for (mi = 0; mi < state[roomName]["mineOnRail"].length; mi++){
		
		const mineDiffX = state[roomName]["mineOnRail"][mi][0] - posX;
		const mineDiffY = state[roomName]["mineOnRail"][mi][1] - posY;
		
		const distance = Math.sqrt(mineDiffX ** 2 + mineDiffY ** 2);
		
		if (distance < dmg*EXP_MULTI){ 
			setTimeout(mineChainExplosion, 250, roomName, state[roomName]["mineOnRail"][mi][0], state[roomName]["mineOnRail"][mi][1]);
		}
	}
	
	for (m = 0; m < spawnMine; m++){
		state[roomName]["mineOnRail"].push([posX + Math.random() * 60 - 30, posY + Math.random() * 60 - 30]);
		io.in(roomName).emit("spawnMine", posX, posY);
	}
	
	const allPlayerPos = computePlayerPos(state[roomName], secretState[roomName]["order"]);
	
	//Check explosion avec une station
	for (i = 0; i < allPlayerPos.length; i++){
		
		const trainDiffX = allPlayerPos[i][0] - posX;
		const trainDiffY = allPlayerPos[i][1] - posY;
		
		const distance = Math.sqrt(trainDiffX ** 2 + trainDiffY ** 2);
		
		if (distance < dmg*EXP_MULTI + 47){
			
			if (sender1) statistics[roomName]["players"][sender1]["damageDealt"] += dmg;
			
			if (sender2) statistics[roomName]["players"][sender2]["damageDealt"] += dmg;
			
			takeDamage(roomName, dmg, distance, i);
		}
	}
	
	//Call the client to draw the explosion
	io.in(roomName).emit('explode', dmg, posX, posY, nameWhenArrive);
}

function chainExplosion(roomName, posX, posY){
	
	const damage = state[roomName]["trainOnRail"][0]["dmg"] + 10;
	
	const sender = state[roomName]["trainOnRail"][0]["sender"];
	
	let mineNum = 0;
	
	if (state[roomName]["trainOnRail"][0]["name"] == "Mine Setter") mineNum += 1;
	
	state[roomName]["trainOnRail"].splice(0, 1);
	
	explode(roomName, posX, posY, damage, sender, null, mineNum, null);
	
	clearTimeout();
}

function mineChainExplosion(roomName, posX, posY){
	
	state[roomName]["mineOnRail"].splice(0, 1);
	
	explode(roomName, posX, posY, 20, null, null, 0, null);
	
	clearTimeout();
}

function arriveSafely(roomName, trainRef, id){
	
	const receiverID = trainRef["way"] ? secretState[roomName]["leftLink"][trainRef["senderUpdate"]] : secretState[roomName]["rightLink"][trainRef["senderUpdate"]];
	
	const sender = trainRef["sender"];
	
	const trainName = trainRef["name"]; 
	
	//Check death station
	if (state[roomName]["players"][receiverID]["health"] == 0){
		passStation(roomName, trainRef, receiverID);
		return;
	}
	
	//Check Russian train
	if (trainRef["name"] == "Russian Roulette" && Math.ceil(Math.random() * 3) < 3){
		passStation(roomName, trainRef, receiverID);
		return;
	}
	
	//Check Jumper Train
	if (trainRef["name"] == "Station Jumper" && trainRef["stationPassed"] == 0){
		passStation(roomName, trainRef, receiverID);
		return;
	}
	
	//Check Tax Collector
	if (trainRef["name"] == "Tax Collector"){
		passStation(roomName, trainRef, receiverID);
		arrivingSpec(roomName, trainName, sender, receiverID);
		return;
	}
	
	let mineNum = 0;
	
	if (trainRef["name"] == "Mine Setter") mineNum += 1;
	
	state[roomName]["trainOnRail"].splice(id, 1);
	
	//Check damage
	if (trainRef["dmg"] > 0){
		const allPlayerPos = computePlayerPos(state[roomName], secretState[roomName]["order"]);
		
		explode(roomName, allPlayerPos[receiverID][0], allPlayerPos[receiverID][1], trainRef["dmg"], sender, null, mineNum, trainName);
	}
	
	arrivingSpec(roomName, trainName, sender, receiverID);
}

function passStation(roomName, trainRef, receiverID){
	
	trainRef["senderUpdate"] = receiverID;
	trainRef["progress"] = 0.0;
	trainRef["stationPassed"] += 1;
	
	const playerMany = state[roomName]["players"].length;
	
	const playerOrd = secretState[roomName]["order"][trainRef["senderUpdate"]];
	 
	let compileWay = trainRef["way"] ? playerOrd-1 == -1 ? playerMany-1 : playerOrd-1 : playerOrd;
	
	trainRef["finalWay"] = compileWay;
}

function arrivingSpec(roomName, trainName, sender, receiver){
	
	const allUsers = io.sockets.adapter.rooms.get(roomName);
	let allUserIDs = [];
	
	if (allUsers){
		for (let i of allUsers){
			allUserIDs.push(i);
		} 
	}
	
	switch(trainName){
		case "Spy":
			io.to(allUserIDs[sender]).emit('spyed', secretState[roomName]["players"][receiver]["credits"], receiver);
			break;
		case "Tax Collector":
			addPoints(roomName, receiver, -3);
			addPoints(roomName, sender, 3);
			break;
		case "Dusty":
			state[roomName]["players"][receiver]["dirtyTrain"] = 2;
			break;
	}
}

function takeDamage(roomName, dmg, distance, i){
	const damageDist = Math.floor((((dmg*EXP_MULTI+47) - distance)+0.01)/(dmg*EXP_MULTI+47) * dmg);
	state[roomName]["players"][i]["health"] -= damageDist;
	
	if (state[roomName]["players"][i]["health"] <= 0){
		takeDownStation(roomName, i);
	}
}

function takeDownStation(roomName, i){
	
	state[roomName]["players"][i]["health"] = 0;
	
	if (state[roomName]["phase"] == 2) return;
	
	addPoints(roomName, i, -secretState[roomName]["players"][i]["credits"]);
	
	let inLiveCount = 0;
	let winner = -1;
	
	for (p = 0; p < state[roomName]["players"].length; p++){
		
		if (state[roomName]["players"][p]["health"] > 0){
			
			inLiveCount += 1;
			winner = p;
		}
	}
	
	statistics[roomName]["winner"] = winner;
	
	if (inLiveCount == 1 || inLiveCount == 0){
		state[roomName]["phase"] = 2;
		io.in(roomName).emit('endGame', statistics[roomName], state[roomName]);
		setTimeout(takeDownRoom, 10000, roomName);
	}
	
}

function takeDownRoom(roomName){
	state[roomName] = null;
	secretState[roomName] = null;
	statistics[roomName] = null;
	io.sockets.clients(roomName).forEach(function(s){
		s.leave(roomName);
	});
}

function emitGameState(roomName, state){
	io.in(roomName)
		.emit('gameState', JSON.stringify(state));
}

io.listen(process.env.PORT || 3742);
