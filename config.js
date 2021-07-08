const uuid = require("uuid/v4");

const config = {
	jwtSecret: "casserole-service-secret",
	orderStatus: ["pending", "accepted", "rejected"],
	monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	newUser: function(user){
		const { name, email, password, role } = user;
		return {
			name,
			email,
			password,
			role,
			apikey: uuid(),
			displayImage: "",
			birthday: null,
			about: "",
			billingAddress1: "",
			billingAddress2: "",
			pincode: "",
			active: true,
			createdAt: Date.now(),
			updatedAt: Date.now()
		}
	}
};

module.exports = config;