import mongoose from "mongoose";

const messageSchema=new mongoose.Schema({
    senderId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
    },
    seen: {
        type: Boolean,
        default: false
    },
    img: {
        type: String,
        default: ""
    },
    chatGPT: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

const Message=mongoose.model("Message", messageSchema);

export default Message;