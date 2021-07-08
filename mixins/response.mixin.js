module.exports = {
	methods: {
		success: function (message, data){
			return {
				success: true,
				message,
				data,
				timestamp: Date.now()
			};
		},
		error: function (message){
			return {
				success: false,
				message,
				timestamp: Date.now()
			};
		}
	}
};