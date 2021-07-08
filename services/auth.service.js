"use strict";

const DbService = require("../mixins/db.mixin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const responseMixins = require("../mixins/response.mixin");
const config = require("../config");

module.exports={
	name: "auth",
	mixins: [
		DbService("users"),
		responseMixins
	],
	actions:{
		check: {
			async handler(ctx){
				try{
					if(!ctx.requestID){
						throw new Error("No header present");
					}
					const userData = this.verifyAuthToken(ctx.requestID);
					const user = await this.adapter.findOne({ apikey: userData.data.apikey });
					if(!user){
						throw new Error("User doesn't exist");
					}
					const tokenData = {email: user.email, role: user.role, apikey: user.apikey}
					const auth = this.generateAuthToken(tokenData);
					delete user.password;
					return this.success("Valid user", {user,auth});
				}catch(error){
					console.log(error);
					return this.error(error);
				}
			}
		},
		login: {
			async handler(ctx){
				try{
					const { email, password } = ctx.params;
					console.log(email, password);
					const fetchUser = await this.adapter.findOne({ email });
					console.log(fetchUser);
					if(!fetchUser){
						throw new Error("User doesn't exist, please register");
					}                 
					if(!bcrypt.compareSync(password,fetchUser.password)){
						throw new Error("Authentication failed");
					}
					const tokenData = {email, role: fetchUser.role, apikey: fetchUser.apikey}
					const auth = this.generateAuthToken(tokenData);
					delete fetchUser.password;
					return this.success("Login successful", {user: fetchUser, auth});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		register: {
			async handler(ctx){
				try{
					let { email, password, role } = ctx.params;
					const fetchUser = await this.adapter.findOne({ email });
					if(fetchUser){
						throw new Error("User already exists, Please login");
					}
					const newUser = config.newUser(ctx.params);
					newUser.password = bcrypt.hashSync(password,10); 
					const createUser = await this.adapter.insert(newUser);
					const tokenData = {email, role, apikey: newUser.apikey};
					const auth = this.generateAuthToken(tokenData);
					delete createUser.password;
					return this.success("Registration Successful, Back to login", {user: createUser, auth});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		forgotPassword: {
			async handler(ctx){
				try{
					const { email } = ctx.params;
					const fetchUser = await this.adapter.findOne({ email });
					if(!fetchUser){
						throw new Error("User doesn't exist");
					}
					const otp = this.generateOtp();
					const auth = this.generateAuthToken({ email, apikey: fetchUser.apikey, role: fetchUser.role, otp });
					console.log(otp)
					return this.success("OTP has been sent your registered email id", {auth});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		verifyOtp: {
			async handler(ctx){
				try{
					const { user, otp } = ctx.params;
					if(parseInt(user.otp) !== parseInt(otp)){
						throw new Error("OTP mis-matched");
					}
					return this.success("Validation successful");
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		resetPassword:{
			async handler(ctx){
				try{
					const { user, password } = ctx.params;
					await this.adapter.collection.updateOne({apikey: user.apikey}, {"$set": {password: bcrypt.hashSync(password, 10)}});
					return this.success("Password changed successfully");
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		updateUserProfile: {
			async handler(ctx){
				try{
					delete ctx.params._id;
					await this.adapter.collection.updateOne({apikey: ctx.params.apikey}, {"$set": {...ctx.params}});
					let fetchUser = await this.adapter.findOne({apikey: ctx.params.apikey});
					return this.success("Profile updated successfully", {user: fetchUser});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		fetchUser: {
			async handler(ctx){
				try{
					const { apikey }=ctx.params;
					return await this.adapter.collection.findOne({ apikey }, {projection: {"_id": 0, password: 0}});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		fetchUserLists: {
			async handler(ctx){
				try{
					const { user } = ctx.params;
					const apikeys = await this.broker.call("orders.fetchOrdersOfUser", { apikey: user.apikey});
					let userLists = [];
					if(apikeys && apikeys.length > 0){
						userLists = await this.adapter.collection.find({"apikey": {"$in": apikeys}}, {projection: {"_id": 0, password: 0}});
					}
					return this.success("Userlist fetched", userLists);
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		}
	},
	methods:{
		generateAuthToken(user){
			return jwt.sign({
				exp: Math.floor(Date.now() / 100) + (60 * 60),
				data: user
			}, config.jwtSecret);
		},
		generateOtp(){
			return Math.floor(1000 + Math.random() * 9000);
		},
		verifyAuthToken(token){
			let verification = jwt.verify(token, config.jwtSecret);
			return verification;
		},
	}
};
