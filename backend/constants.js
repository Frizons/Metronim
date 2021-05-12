const TICK_RATE = 30;
const TRAIN_SPEED = 12;
const MAX_PLAYERS = 8;
const MAX_HEALTH = 100;
const EXP_MULTI = 5;

const TRAIN_TYPE = [
	[{name : "Spy", type : 0, cost : 2, dmg : 0, desc : "Stop at the first station encountered and give its number of credits."}],
	
	[{name : "Express", type : 1, cost : 6, dmg : 10, desc : "Goes two times faster than other train, crash and make damage at impact."},
	{name : "Tax Collector", type : 1, cost : 5, dmg : 0, desc : "Passes in all station collecting 3 credits, until destruction."},
	{name : "Train Thief", type : 1, cost : 10, dmg : 0, desc : "Go to the next station, stealing and turning over the first train encountered."},
	{name : "Peaceful", type : 1, cost : 4, dmg : 0, desc : "Go to the middle of the way and wait to be destroyed."},
	{name : "Dusty", type : 1, cost : 4, dmg : 1, desc : "Explode in the first station encountered making is next 2 trains slower."}],
	
	[{name : "Mine Setter", type : 2, cost : 4, dmg : 20, desc : "Place a mine after explosion."},
	{name : "Dynamite", type : 2, cost : 4, dmg : 25, desc : "Explode in the first station encountered."},
	{name : "Station Jumper", type : 2, cost : 4, dmg : 30, desc : "Explode in the second station encountered."},
	{name : "Russian Roulette", type : 2, cost : 6, dmg : 20, desc : "Have 1 chance out of 3 to explode in each station meet."},
	{name : "Roadhog", type : 2, cost : 6, dmg : 15, desc : "Resist to one collision but make small damage."},
	{name : "Nuclear", type : 2, cost : 15, dmg : 100, desc : "Obliterate the first station encountered."}]
];

module.exports = { 
	TICK_RATE,
	TRAIN_SPEED,
	MAX_PLAYERS,
	MAX_HEALTH,
	TRAIN_TYPE,
	EXP_MULTI,
}
