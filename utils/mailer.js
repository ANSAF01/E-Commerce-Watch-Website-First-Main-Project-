const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const sendOTPEmail = async (to, otp) => {
    const mailOptions = {
        from: `"FG-UNITED" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Your OTP Code - FG-UNITED',
        html: `<div style="font-family:sans-serif; max-width: 600px; margin: 0 auto;">
             <h2 style="color: #333;">FG-UNITED</h2>
             <p style="color: #666; font-size: 16px;">Your One-Time Password (OTP) is:</p>
             <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
               <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
             </div>
             <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
             <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
           </div>`,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
