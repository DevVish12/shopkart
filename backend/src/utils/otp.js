import bcrypt from 'bcryptjs';

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
export const hashOtp = (otp) => bcrypt.hash(String(otp), 10);
export const compareOtp = (otp, hash) => bcrypt.compare(String(otp), hash);
