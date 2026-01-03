import jwt from"jsonwebtoken";

const generateAccessToken = async(user)=>{
    const token = jwt.sign({userId: user.user_id, email: user.email,}, "abcd",{expiresIn:"15min"});
    return token;
}

const generateRefreshToken = async(user)=>{
    const token = jwt.sign({userId: user.user_id}, "cdef",{expiresIn:"7d"});
    return token;
} 
export{
    generateAccessToken, generateRefreshToken
}