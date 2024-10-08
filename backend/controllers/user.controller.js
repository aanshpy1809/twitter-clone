import Notification from "../models/notifications.model.js";
import User from "../models/user.model.js";
import bcrypt from 'bcryptjs';
import {v2 as cloudinary} from 'cloudinary';

export const getUserProfile=async(req,res)=>{
    try {
        const {username}=req.params;
        const user=await User.findOne({username}).select("-password");
        if(!user){
            return res.status(401).json({error: "User not found!"})
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile controller", error.message);
		res.status(500).json({ error: error.message});
    }
}

export const getUserProfileById=async(req,res)=>{
    try {
        const {id}=req.params;
        const user=await User.findById(id).select("-password");
        if(!user){
            return res.status(401).json({error: "User not found!"})
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfileById controller", error.message);
		res.status(500).json({ error: error.message});
    }
}

export const followUnfollowUser = async (req, res) => {
	try {
		const { id } = req.params;
		const userToModify = await User.findById(id);
		const currentUser = await User.findById(req.user._id);

		if (id === req.user._id.toString()) {
			return res.status(400).json({ error: "You can't follow/unfollow yourself" });
		}

		if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

		const isFollowing = currentUser.following.includes(id);

		if (isFollowing) {
			// Unfollow the user
			await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

			// TODO: return the id of the user as a response
			res.status(200).json({ message: "User unfollowed successfully" });
		} else {
			// Follow the user
			await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
			// Send notification to the user
			const newNotification = new Notification({
				type: "follow",
				from: req.user._id,
				to: userToModify._id,
			});

			await newNotification.save();

			// TODO: return the id of the user as a response
			res.status(200).json({ message: "User followed successfully" });
		}
	} catch (error) {
		console.log("Error in followUnfollowUser: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const getUsers=async(req,res)=>{
    try {
        const userId=req.user._id;
        const filteredUsers=await User.find({_id: {$ne: userId}}).select("_id username fullName profileImg");
        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getUsers: ", error.message);
		res.status(500).json({ error: error.message });
    }
    
    
}

export const getSuggestedUser=async(req,res)=>{
    try {
        const userId=req.user._id;
        const usersFollowedByMe=await User.findById(userId).select("following");
        // const suggestedUsers = await User.find({
        //     _id: {
        //       $nin: usersFollowedByMe.following, // Not in the followed users array
        //     },
        //     _id: {
        //       $ne: userId, // Not equal to the given userId
        //     },
        //   })
        //     .limit(4);
        const users=await User.aggregate([
            {
                $match: {
                    _id: {$ne : userId}
                }
            },
            {
                $sample: {size: 10}
            }
        ]);

        const filteredUsers=users.filter(user=>!usersFollowedByMe.following.includes(user._id));
        const suggestedUsers=filteredUsers.slice(0,4);
        suggestedUsers.forEach((user)=>{user.password=null});

        res.status(200).json(suggestedUsers)

    } catch (error) {
        console.log("Error in getSuggestedUser controller", error.message);
		res.status(500).json({ error: error.message});
    }
}

export const updateUser=async(req,res)=>{
    const {fullName, username, email, currentPassword, password, bio, link}=req.body;
    let {profileImg, coverImg}=req.body;
    const userId=req.user._id;

    try {
        let user=await User.findById(userId);
        if((!currentPassword && password) || (!password && currentPassword)){
            return res.status(400).json({error: "Both the new password and current password must be passed !"})
        }
        if(password){
            const passwordMatch=await bcrypt.compare(currentPassword, user.password);
            if(passwordMatch){
                if(password.length<6){
                    return res.status(400).json({error: "Password length must be atleast 6 characters!"})
                }
                const salt=await bcrypt.genSalt(10);
                user.password=await bcrypt.hash(password,salt);
            }else{
                return res.status(401).json({error: "Current password is incorrect!"})
            }
        }
        

        if(profileImg){
            if(user.profileImg){
                await cloudinary.uploader.destroy(user.profileImg.split('/').pop().split('.')[0])
            }
            const uploadedResponse=await cloudinary.uploader.upload(profileImg);
            profileImg=uploadedResponse.secure_url;
        }
        if(coverImg){
            if(user.coverImg){
                await cloudinary.uploader.destroy(user.coverImg.split('/').pop().split('.')[0])
            }
            const uploadedResponse=await cloudinary.uploader.upload(coverImg);
            coverImg=uploadedResponse.secure_url;
        }

        user.fullName=fullName || user.fullName;
        user.email=email || user.email;
        user.username=username || user.username;
        user.profileImg=profileImg || user.profileImg;
        user.coverImg=coverImg || user.coverImg;
        user.bio =bio || user.bio;
        user.link=link || user.link;

        await user.save();
        user.password=null;
        res.status(201).json(user);

    } catch (error) {
        console.log("Error in updateUser controller", error.message);
		res.status(500).json({ error: error.message});
    }
}

