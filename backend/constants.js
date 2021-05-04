const TICK_RATE = 30;
const TRAIN_SPEED = 8;
const MAX_PLAYERS = 8;
const MAX_HEALTH = 100;

const TRAIN_TYPE = [
	[{name : "Scout", type : 0, cost : 2, dmg : 0, desc : "Does nothing special."},
	{name : "Spy", type : 0, cost : 3, dmg : 0, desc : "Stop at the first station encountered and give its number of credits."},
	{name : "Smoker", type : 0, cost : 3, dmg : 0, desc : "Allows all trains behind it to be unidentifiable."},
	{name : "Silenced", type : 0, cost : 3, dmg : 0, desc : "Can pass over mines without triggering them."}],
	
	[{name : "Express", type : 1, cost : 6, dmg : 10, desc : "Goes two times faster than other train, crash and make damage at impact."},
	{name : "Tax Collector", type : 1, cost : 5, dmg : 0, desc : "Passes in all station collecting 3 credits, until destruction."},
	{name : "Train Thief", type : 1, cost : 10, dmg : 0, desc : "Go to the next station, stealing and turning over the first train encountered."},
	{name : "Peaceful", type : 1, cost : 4, dmg : 0, desc : "Go to the middle of the way and wait to be destroyed."},
	{name : "Dusty", type : 1, cost : 4, dmg : 1, desc : "Explode in the first station encountered making is next 2 trains slower."}],
	
	[{name : "Mine Setter", type : 2, cost : 5, dmg : 15, desc : "Place a mine after explosion."}, //bip bip bip bi bi bb biiiiiip BROLOLOL
	{name : "Dynamite", type : 2, cost : 4, dmg : 25, desc : "Explode in the first station encountered."},
	{name : "Station Jumper", type : 2, cost : 4, dmg : 35, desc : "Explode in the second station encountered."},
	{name : "Russian Roulette", type : 2, cost : 6, dmg : 20, desc : "Have 1 chance out of 3 two explode in each station meet."},
	{name : "Roadhog", type : 2, cost : 6, dmg : 10, desc : "Resist to one collision but make small damage."},
	{name : "Nuclear", type : 2, cost : 15, dmg : 100, desc : "Obliterate the first station encountered."}]
];

module.exports = { 
	TICK_RATE,
	TRAIN_SPEED,
	MAX_PLAYERS,
	MAX_HEALTH,
	TRAIN_TYPE,
}
