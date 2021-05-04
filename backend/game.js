const {METRO_SPEED, MAX_HEALTH, TRAIN_TYPE } = require('./constants');
const { randomNum } = require('./utils');

/*
	PUBLIC =
	
	players: [],
	phase: 0, // 0: Lobby, 1: Game, 2:Result
	trainOnRail : [],
	
	PRIVATE =
	
	players: [credits]
	order: [],
	
	STATS =
	
*/


module.exports = {
	initGame,
	addPublicPlayer,
	addPrivatePlayer,
	trainIdByName,
	getAllTrainPos,
	getTrainPos,
	computePlayerPos,
}

function initGame() {
	
	//Cree et retourne les state public et privee par defaut
	const twoState = [createGameState(), createPrivateState()]
	return twoState;
}

//cree le state de depart
function createGameState() {
	return {
		players: [],
		phase: 0, // 0: Lobby, 1: Game, 2:Result
		trainOnRail : [],
		trainSheet : compileSheet(),
		count : 0,
	};
}

function createPrivateState() {
	return {
		players: [],
		order: [],
		leftLink : [],
		rightLink : [],
	};
}

function compileSheet(){
	let finalSheet = [];
	
	for (i = 0; i < 3; i++){
		for (each = 0; each < TRAIN_TYPE[i].length; each++){
			finalSheet.push(TRAIN_TYPE[i][each]);
		}
	}
	
	return finalSheet;
}

function trainIdByName(name){
	const searchSheet = compileSheet();
	let result;
	
	for (i = 0; i < searchSheet.length; i++){
		if (searchSheet[i]["name"] == name) result = i;
	}
	
	return result;
}

function getTrainPos(state, trainCollision, order, leftLink, rightLink){
	let result = [];
	const TrainRef = trainCollision;
	
	const playerPos = computePlayerPos(state, order);
	
	
	const theWay = TrainRef["way"];
	
	let sendId = TrainRef["senderUpdate"];
	
	let receiveId = theWay ? leftLink[sendId] : rightLink[sendId];
	
	const nodeDiffX = playerPos[receiveId][0] - playerPos[sendId][0];
	const nodeDiffY = playerPos[receiveId][1] - playerPos[sendId][1];
	
	const resultX = playerPos[sendId][0] + nodeDiffX * (TrainRef["progress"] + 0.1);
	const resultY = playerPos[sendId][1] + nodeDiffY * (TrainRef["progress"] + 0.1);
	
	result.push(resultX);
	result.push(resultY);
	
	return result;
}

function getAllTrainPos(state, order, leftLink, rightLink){
	
	let result = [];
	const allTrainRef = state["trainOnRail"];
	
	const playerPos = computePlayerPos(state, order);
	
	for(i = 0; i < allTrainRef.length; i++){
		
		const theWay = allTrainRef[i]["way"];
		
		let sendId = allTrainRef[i]["senderUpdate"];
		let receiveId = theWay ? leftLink[sendId] : rightLink[sendId];
		
		const nodeDiffX = playerPos[receiveId][0] - playerPos[sendId][0];
		const nodeDiffY = playerPos[receiveId][1] - playerPos[sendId][1];
		
		const resultX = playerPos[sendId][0] + nodeDiffX * (allTrainRef[i]["progress"]+0.05);
		const resultY = playerPos[sendId][1] + nodeDiffY * (allTrainRef[i]["progress"]+0.05);
		
		result.push([resultX, resultY]);
	}
	return result;
}

function computePlayerPos(state, order){
	
	let playerPos = [];
	
	const playerMany = state["players"].length;
	
	let decay = 200 * (playerMany-1)/2;
	decay = 950 - decay;
	
	const playersTop = Math.ceil(playerMany/2);
	
	for (i = 0; i < playerMany; i++){
		
		const ind = order[i];
		
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
	
	return playerPos;
}


//ajoute un status de joueur au GameState
function addPublicPlayer(state, playerName, skinChosen) {
	const newState = state;
	let playersArray = newState["players"];
	playersArray.push(
		{
			pseudo : playerName, //player's pseudo                            (PUBLIC)
			health : MAX_HEALTH, //player's health                            (PUBLIC)
			skin : skinChosen,  //skin chosen by the player                   (PUBLIC)
		});
	newState["players"] = playersArray;
	
	return newState;
}

function addPrivatePlayer(privateState, playerNum) {
	const newPrivateState = privateState;
	
	var secretArray = newPrivateState["players"];
	secretArray.push(
	{
		shop : generateShop(),
		credits : 50, //remaining credits                    	   	         (PRIVATE)
	});
	
	newPrivateState["players"] = secretArray
	
	return newPrivateState;
}

function generateShop(){
	let finalShop = [];
	let dispoSheet = JSON.parse(JSON.stringify(TRAIN_TYPE));
	const typeOrder = [0, 1, 2, 2];
	
	for (i = 0; i < 4; i++){
		
		const typeLength = [dispoSheet[0].length, dispoSheet[1].length, dispoSheet[2].length, dispoSheet[2].length];
	
		const randInd = Math.floor(randomNum(0, typeLength[i]));
		
		finalShop.push(dispoSheet[typeOrder[i]][randInd]);
		dispoSheet[typeOrder[i]].splice(randInd, 1);
	}
	
	return finalShop;
}