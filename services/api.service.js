"use strict";

const jwt = require("jsonwebtoken");
const ApiService = require("moleculer-web");
const multiparty = require("multiparty");
const ResponseMixins = require("../mixins/response.mixin");
const config = require("../config");
require("dotenv").config();

console.log(process.env.ORIGIN)

module.exports = {
	name: "api",
	mixins: [ApiService, ResponseMixins],
	settings: {
		port: process.env.PORT || 5000,
		routes: [{
			cors: {
				origin: [process.env.ORIGIN, "*"]
			},
			path: "/api",
			onBeforeCall(ctx, route, req, res) {
				if (req.$alias.path.indexOf("login") === -1
					&& req.$alias.path.indexOf("register") === -1
					&& req.$alias.path.indexOf("password") === -1
					&& req.$alias.path.indexOf("otp") === -1
				) {
					const token = req.headers["authorization"];
					if (token === null || token === undefined) {
						res.end("BAD REQUEST. MISSING HEADER");
					}
					let user = this.authenticate(token);
					if (user) {
						if (req.$alias.path.indexOf("check") !== -1 || req.$alias.path.indexOf("otp") !== -1 || req.$alias.path.indexOf("password") !== -1) {
							ctx.requestID = token;
						}
						return;
					}
				}
			},
			aliases: {
				
				/***************************************************AUTH APIS**********************************************/

				"GET auth/check": "auth.check",
				"POST auth/login": "auth.login",
				"POST auth/register": "auth.register",
				"POST auth/forgot/password": "auth.forgotPassword",
				"POST auth/verify/otp"(req, res) {
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					const otp = req.body;
					this.broker.call("auth.verifyOtp", { user, otp: otp.otp })
						.then(user => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(user));
						})
				},
				"POST auth/reset/password"(req, res) {
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					const password = req.body;
					this.broker.call("auth.resetPassword", { user, password: password.password })
						.then(user => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(user));
						})
				},
				"PUT auth/user/update": "auth.updateUserProfile",
				"GET auth/user/lists": "auth.fetchUserLists",

				/***************************************************POST APIS**********************************************/

				"POST post/create"(req, res) {
					let form = new multiparty.Form();
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					form.parse(req, (err, fields, images) => {
						this.broker.call("posts.createPost", { fields, images, user })
							.then(data => {
								res.setHeader("Content-Type", "Application/Json; charset=utf-8");
								res.writeHead(200);
								res.end(JSON.stringify(data));
							});
					});
				},
				"GET post/list/:filter/"(req, res) {
					const { search, filter } = req.$params;
					this.broker.call("posts.getPosts", { search, filter })
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"GET post/details/:postId" : "posts.getPostById",
				"GET post/provider/list"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					const { search } = req.$params;
					this.broker.call("posts.getProviderPosts", { user, search })
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"GET post/chef/list/:pageNumber/:pageSize"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					const { search, pageNumber, pageSize } = req.$params;
					this.broker.call("posts.getChefPosts", { user, search, pageNumber, pageSize })
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"PUT post/chef/update": "posts.editChefPosts",
				"DELETE post/chef/delete/:postId": "posts.deleteChefPosts",

				/***************************************************CART APIS**********************************************/
				"POST cart/add"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					this.broker.call("cart.addToCart", {user, data: req.body})
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"GET cart/fetch"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					this.broker.call("cart.fetchCart", {user})
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"DELETE cart/remove/:postId/:cartId" : "cart.removeFromCart",
				"DELETE cart/clear/:cartId" : "cart.clearCart",

				/***************************************************ORDER APIS**********************************************/

				"POST order/create"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					const { cartId, address } = req.body;
					this.broker.call("orders.createOrder", {user, cartId , address })
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"GET order/chef/get"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					const { search } = req.$params;
					this.broker.call("orders.fetchChefOrders", { user, search })
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"GET order/list"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					this.broker.call("orders.fetchOrders", { user })
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						});
				},
				"PUT order/status": "orders.orderStatusChange",

				/***************************************************DASHBOARD APIS**********************************************/
				"GET dashboard/count"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					this.broker.call("dashboard.fetchCount", {user})
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						})
				},
				"GET dashboard/order"(req,res){
					const verificationData = this.authenticate(req.headers["authorization"]);
					const user = verificationData.data;
					this.broker.call("orders.fetchOrdersDataDashboard", {user})
						.then(data => {
							res.setHeader("Content-Type", "Application/Json; charset=utf-8");
							res.writeHead(200);
							res.end(JSON.stringify(data));
						})
				}
			}
		}]
	},
	methods: {
		authenticate(token) {
			if(token !== "null"){
				let verification = jwt.verify(token, config.jwtSecret);
				return verification;
			}
		}
	}
};
