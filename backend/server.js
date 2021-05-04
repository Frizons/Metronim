const { initGame , addPrivatePlayer, addPublicPlayer, trainIdByName, getAllTrainPos, getTrainPos, computePlayerPos } = require('./game');
const { TICK_RATE , MAX_PLAYERS, TRAIN_SPEED, TRAIN_TYPE } = require('./constants');
const { makeid } = require('./utils');

const state = {}; //state représente la version original du Status de la game, il est envoyer au client souvent
const secretState = {};

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
	
	function handleNewGame(pseudo, skinChosen){
		let roomName = makeid(5);
		
		//Donne le code a tout les clients
		client.emit('gameCode', roomName);
		
		//Initialise un gameState dans la room
		var combine = initGame();
		state[roomName] = combine[0];
		secretState[roomName] = combine[1];
		
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
		
		if (secretState[roomName]["players"][playerId]["credits"] < trainCost) return;
		
		addPoints(roomName, playerId, -trainCost);
		
		const playerMany = state[roomName]["players"].length;
		
		const playerOrd = secretState[roomName]["order"][playerId];
		
		let compileWay = linkId ? playerOrd-1 == -1 ? playerMany-1 : playerOrd-1 : playerOrd;
		
		state[roomName]["trainOnRail"].push({progress : 0.0, speed : trainSpeed, sender : playerId, way : linkId, finalWay : compileWay, dmg : trainDmg, senderUpdate : playerId});
		
	}
});

function creditsDistrib(roomName){
	state[roomName]["count"] += 1;
	if (state[roomName]["count"] >= 90){
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
			const forceSpeed = state[roomName]["trainOnRail"][id]["speed"] * 4;
			
			state[roomName]["trainOnRail"][id]["progress"] += 1 / TICK_RATE / (TRAIN_SPEED + forceSpeed);
		}
		
		const mainTrain = state[roomName]["trainOnRail"][id];
		
		for (comp = 0; comp < state[roomName]["trainOnRail"].length; comp++){
			
			if (comp == id) break;
			
			const checkTrain = state[roomName]["trainOnRail"][comp];
			
			if(!mainTrain || !checkTrain){
				console.log("ERROR : in updateTrain");
				return; //je pense que parfois, bad timing oblige => on demande une ref qui vient d'etre supprimé
			} 
			
			if(mainTrain["finalWay"] == checkTrain["finalWay"]){
				
				let mainProgress = mainTrain["progress"] + 0.05;
				
				let checkProgress = checkTrain["senderUpdate"] == mainTrain["senderUpdate"] ? checkTrain["progress"]-0.05 : (checkTrain["progress"] + 0.05) * -1 + 1;
				
				if (mainProgress > checkProgress && mainProgress < checkProgress + 0.05){
					trainCollide(roomName, mainTrain, checkTrain, mainTrain["progress"] - 0.05, id, comp);
					return;
				}
			}
		}
	
	}
}

function trainCollide(roomName, train1, train2, epicenter, id1, id2){
	
	const epicenterPos = getTrainPos(state[roomName], train1, secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
	
	const additionalDamage = state[roomName]["trainOnRail"][id1]["dmg"] + state[roomName]["trainOnRail"][id2]["dmg"];
	
	state[roomName]["trainOnRail"].splice(id1, 1);
	state[roomName]["trainOnRail"].splice(id2, 1);
	
	explode(roomName, epicenterPos[0], epicenterPos[1], 10 + additionalDamage);
	
}

function explode(roomName, posX, posY, dmg){
	
	let allTrainPos = getAllTrainPos(state[roomName], secretState[roomName]["order"], secretState[roomName]["leftLink"], secretState[roomName]["rightLink"]);
	
	//Check explosion avec d'autre train
	for (i = 0; i < allTrainPos.length; i++){
		
		const trainDiffX = allTrainPos[i][0] - posX;
		const trainDiffY = allTrainPos[i][1] - posY;
		
		const distance = Math.sqrt(trainDiffX ** 2 + trainDiffY ** 2);
		
		if (distance < dmg*5 + 25){
			setTimeout(chainExplosion, 100, roomName, i, JSON.parse(JSON.stringify(allTrainPos)));
			allTrainPos.splice(0, 1);
		}
	}
	
	const allPlayerPos = computePlayerPos(state[roomName], secretState[roomName]["order"]);
	
	//Check explosion avec une station
	for (i = 0; i < allPlayerPos.length; i++){
		
		const trainDiffX = allPlayerPos[i][0] - posX;
		const trainDiffY = allPlayerPos[i][1] - posY;
		
		const distance = Math.sqrt(trainDiffX ** 2 + trainDiffY ** 2);
		
		if (distance < dmg*5 + 47){
			takeDamage(roomName, dmg, distance, i);
		}
	}
	
	//Call the client to draw the explosion
	io.in(roomName).emit('explode', dmg, posX, posY);
}

function chainExplosion(roomName, i, allTrainPos){
	
	const damage = state[roomName]["trainOnRail"][0]["dmg"] + 10;
	
	state[roomName]["trainOnRail"].splice(0, 1);
	
	explode(roomName, allTrainPos[i][0], allTrainPos[i][1], damage);
	
	clearTimeout();
}

function arriveSafely(roomName, trainRef, id){
	
	const receiverID = trainRef["way"] ? secretState[roomName]["leftLink"][trainRef["senderUpdate"]] : secretState[roomName]["rightLink"][trainRef["senderUpdate"]];
	
	if (state[roomName]["players"][receiverID]["health"] == 0){
		state[roomName]["trainOnRail"][id]["senderUpdate"] = receiverID;
		state[roomName]["trainOnRail"][id]["progress"] = 0.0;
		
		const playerMany = state[roomName]["players"].length;
		
		const playerOrd = secretState[roomName]["order"][trainRef["senderUpdate"]];
		 
		let compileWay = trainRef["way"] ? playerOrd-1 == -1 ? playerMany-1 : playerOrd-1 : playerOrd;
		
		state[roomName]["trainOnRail"][id]["finalWay"] = compileWay;
		
		
		return;
	}else{
		state[roomName]["trainOnRail"].splice(id, 1);
	}
	
	if (trainRef["dmg"] == 0){
		addPoints(roomName, receiverID, 1);
	}else{
		const allPlayerPos = computePlayerPos(state[roomName], secretState[roomName]["order"]);
		
		explode(roomName, allPlayerPos[receiverID][0], allPlayerPos[receiverID][1], trainRef["dmg"]);
	}
}

function takeDamage(roomName, dmg, distance, i){
	const damageDist = Math.floor((((dmg*5+47) - distance)+0.01)/(dmg*5+47) * dmg);
	state[roomName]["players"][i]["health"] -= damageDist;
	
	if (state[roomName]["players"][i]["health"] <= 0){
		state[roomName]["players"][i]["health"] = 0;
		addPoints(roomName, i, -secretState[roomName]["players"][i]["credits"]);
	}
}

function emitGameState(roomName, state){
	io.in(roomName)
		.emit('gameState', JSON.stringify(state));
}

function emitEndGame(roomName){
	io.in(roomName)
		.emit('endGame');
}

io.listen(process.env.PORT || 3742);
