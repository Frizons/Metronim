module.exports = {
	makeid,
	randomNum,
}

function makeid(length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	var charctersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charctersLength));
	}
	return result;
}

function randomNum(min, max){
	var result = Math.random() * (max - min) + min;
	return result;
}