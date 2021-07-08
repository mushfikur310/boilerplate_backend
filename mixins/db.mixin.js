"use strict";

const DbService = require("moleculer-db");
require("dotenv").config();
const mongoURI = process.env.MONGO;
const MongoAdapter = require("moleculer-db-adapter-mongo");

module.exports = function(collection){
	if(mongoURI){
		return {
			mixins: [DbService],
			adapter: new MongoAdapter(mongoURI,{
				useNewUrlParser: true, 
				reconnectTries: Number.MAX_VALUE,
				reconnectInterval: 500,
				keepAlive: true,
				autoReconnect: true
			}),
			collection
		};
	}else{
		return "Mongodb String is required";
	}
};