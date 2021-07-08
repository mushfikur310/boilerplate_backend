"use strict";

const uuid = require('uuid/v4');
const DbSerivce = require("../mixins/db.mixin");
const responseMixins = require("../mixins/response.mixin");

module.exports={
	name: "posts",
	mixins: [
		DbSerivce("posts"),
		responseMixins
	],
	actions:{
		createPost:{
			async handler(ctx){
				try{
					const { fields, user, images } = ctx.params;
					const fetchUser = await this.broker.call("auth.fetchUser",{ apikey: user.apikey });
					if(!fetchUser){
						throw new Error("User doesn't exist");
					}
					let post = {
						apikey: fetchUser.apikey,
						createdBy: fetchUser,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						postId: uuid()
					};
					Object.keys(fields).forEach(field=>{
						post[field] = fields[field][0]
					});
					post.images = [];
					const newPost = await this.adapter.insert(post);
					return this.success('Post created succesfully', {newPost});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		getPosts:{
			async handler(ctx){
				try{
					let { filter, search } = ctx.params;
					search = search ? this.escapeRegex(search) : ".";
					let searchRegex = new RegExp( search, "i");
					let query = {};
					if(filter !== 'all'){
						query['type'] = filter;
					}
					query["dishName"] = searchRegex;
					const total = await this.adapter.count({ query });
					const posts = await this.adapter.find({ query });
					return this.success("Posts fetched",{ total, posts });
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		getProviderPosts:{
			async handler(ctx){
				try{
					let { search } = ctx.params;
					search = search ? this.escapeRegex(search) : "."
					let searchRegex = new RegExp( search, "i");
					let query = {
						item: searchRegex
					};
					const providerPostsTotal = await this.adapter.count({ query });
					const providerPosts = await this.adapter.find({ query });
					return this.success("Provider postd fetched", { providerPostsTotal, providerPosts });
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		getPostById:{
			async handler(ctx){
				try{
					let { postId } = ctx.params;
					let post = await this.adapter.findOne({ postId });
					return this.success("Post found", {post});
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		getChefPosts:{
			async handler(ctx){
				try{
					let { user, search, pageNumber, pageSize } = ctx.params;
					console.log(ctx.params)
					pageNumber = parseInt(pageNumber);
					pageSize = parseInt(pageSize);
					search = search ? this.escapeRegex(search) : ".";
					let searchRegex = new RegExp(search, "i");
					let query = {
						"createdBy.apikey": user.apikey,
						[user.role === "provider" ? "item" : "dishName"]: searchRegex
					}
					let chefPosts = await this.adapter.find({ 
						query,
						offset: (pageNumber - 1)*pageSize,
						limit: pageSize
					});
					let totalChefPosts = await this.adapter.count({ query });
					return this.success("Chef posts found", { chefPosts, totalChefPosts });
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		editChefPosts:{
			async handler(ctx){
				try{
					let { post } = ctx.params;
					delete post._id;
					delete post.createdBy;
					await this.adapter.collection.updateOne({ postId: post.postId }, {"$set": {...post}});
					return this.success("Post has been updated successfully");
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		deleteChefPosts:{
			async handler(ctx){
				try{
					let { postId } = ctx.params;
					await this.adapter.collection.deleteOne({postId});
					return this.success("Post has been deleted sucessfully");
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		},
		totalPostsDashboard:{
			async handler(ctx){
				try{
					const { user } = ctx.params;
					let totalPosts = await this.adapter.count({ query: {apikey: user.apikey}});
					return totalPosts;
				}catch(error){
					console.log(error);
					return this.error(error.message);
				}
			}
		}
	},
	methods:{
		escapeRegex(term){
			return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		},
	}
};