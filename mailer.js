const nodemailer = require('nodemailer');

// Ensure SMTP_USER and SMTP_PASS are set in your .env or Render Environment Variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendConfirmationEmail = async (booking) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping confirmation email for", booking.order_id);
        return;
    }

    const { order_id, name, email, item_name, price, booking_date, booking_time, players, player_two_name } = booking;
    const isTwoPlayer = (players === 2 || price >= 300);

    const amountLabel = booking.status === 'CASH' ? 'Amount Due (Pay At Desk)' : 'Amount Paid';

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e5b869; margin-bottom: 5px;">Booking Confirmed!</h1>
            <p style="color: #aaaaaa; margin-top: 0;">Order ID: ${order_id}</p>
            ${isTwoPlayer ? `
            <div style="display:inline-block; margin-top: 8px; background: rgba(229,184,105,0.15); border: 1px solid rgba(229,184,105,0.4); padding: 6px 14px; border-radius: 20px;">
                <span style="color: #e5b869; font-weight: bold; font-size: 14px;">👥 2-PLAYER DUO PASS (Admit 2 Persons)</span>
            </div>` : `
            <div style="display:inline-block; margin-top: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); padding: 5px 12px; border-radius: 20px;">
                <span style="color: #cccccc; font-size: 13px;">👤 1-Player Standard Pass (Admit 1 Person)</span>
            </div>`}
        </div>
        
        <div style="background-color: #1a1a1f; padding: 20px; border-radius: 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; color: #cccccc;">Your booking at Havoc Sim Podium has been confirmed. ${isTwoPlayer ? 'Your pass includes arena entry and play for <strong>2 Players</strong>!' : 'Get ready to race!'}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Experience</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${item_name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Gate Entry / Pass</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold; color: ${isTwoPlayer ? '#e5b869' : '#ffffff'};">
                        ${isTwoPlayer ? `👥 2 Players (Co-op Duo Pass)${player_two_name ? `<br><span style="font-size: 12px; font-weight: normal; color: #aaaaaa;">Player 2: ${player_two_name}</span>` : ''}` : '👤 1 Player'}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Date</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${booking_date}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Time</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${booking_time}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Subtotal</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">₹${(price / 1.18).toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">GST (18%)</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">₹${(price - (price / 1.18)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #888;">${amountLabel}</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #e5b869;">₹${price}</td>
                </tr>
            </table>

            <div style="margin-top: 15px; padding: 12px; background: rgba(229,184,105,0.08); border: 1px dashed rgba(229,184,105,0.3); border-radius: 6px; font-size: 13px; color: #e5b869; text-align: center;">
                🛡️ <strong>Gate Verification Notice:</strong> ${isTwoPlayer ? 'Show this email at the gate. This pass authorizes entry for <strong>2 players</strong>.' : 'Show this email at the gate. This pass authorizes entry for <strong>1 player</strong>.'}
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #666666;">
            <p>Please arrive 10 minutes before your slot.</p>
            <p>Havoc Sim Podium • <a href="https://havocsimpodium.com" style="color: #e5b869;">Visit Website</a></p>
        </div>
    </div>
    `;

    try {
        const textContent = `Booking Confirmed!\nOrder ID: ${order_id}\nPass Type: ${isTwoPlayer ? '2 Players (Duo Pass - Admit 2)' : '1 Player'}${player_two_name ? `\nPlayer 2: ${player_two_name}` : ''}\n\nHi ${name},\nYour booking at Havoc Sim Podium has been confirmed. ${isTwoPlayer ? 'Your pass admits 2 players to the arena.' : 'Get ready to race!'}\n\nExperience: ${item_name}\nDate: ${booking_date}\nTime: ${booking_time}\n${amountLabel}: ₹${price}\n\nGate Verification: Show this email at the arena entrance. Admits ${isTwoPlayer ? '2 players' : '1 player'}.\nPlease arrive 10 minutes before your slot.\nVisit Website: https://havocsimpodium.com`;

        await transporter.sendMail({
            from: `"Havoc Sim Podium" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Booking Confirmed [${isTwoPlayer ? '2-Player Duo Pass' : '1-Player'}]: ${item_name} - ${booking_date}`,
            text: textContent,
            html: htmlContent
        });
        await transporter.sendMail({
            from: `"Havoc System" <${process.env.SMTP_USER}>`,
            to: 'havochobbysim@gmail.com',
            subject: `New Booking Alert [${isTwoPlayer ? '2 Players' : '1 Player'}]: ${order_id}`,
            text: `A new order has been booked.\n\nOrder ID: ${order_id}\nPass Type: ${isTwoPlayer ? '2-Player Combo (Admit 2)' : '1-Player'}${player_two_name ? `\nPlayer 2: ${player_two_name}` : ''}\nCustomer Name: ${name}\nCustomer Email: ${email}\nExperience: ${item_name}\nDate: ${booking_date}\nTime: ${booking_time}\nAmount: ₹${price}\n\nPlease check the admin dashboard for details.`
        });
        
        console.log(`[${new Date().toISOString()}] Confirmation email sent to ${email} for order ${order_id}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending email to ${email}:`, error);
    }
};

const sendBulkEmail = async (subject, htmlBody, bccList) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping bulk email.");
        return { success: false, error: "SMTP credentials not configured." };
    }

    try {
        const mailOptions = {
            from: `"Havoc Sim Podium" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self, bcc everyone else
            bcc: bccList,
            subject: subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Bulk email sent: ' + info.response);
        return { success: true };
    } catch (error) {
        console.error('Error sending bulk email:', error);
        return { success: false, error: error.message };
    }
};

const sendInstructorEmail = async (instructor, booking) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Skipping instructor email for", booking.order_id);
        return;
    }
    
    if (!instructor.email) return;

    const { name, item_name, booking_date, booking_time } = booking;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e5b869; margin-bottom: 5px;">New Booking Assigned!</h1>
            <p style="color: #aaaaaa; margin-top: 0;">You have a new student.</p>
        </div>
        
        <div style="background-color: #1a1a1f; padding: 20px; border-radius: 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi <strong>${instructor.name}</strong>,</p>
            <p style="font-size: 16px; color: #cccccc;">A new slot has been booked with you as the instructor.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Student Name</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Simulator</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${item_name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Date</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${booking_date}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #888;">Time</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #333; text-align: right; font-weight: bold;">${booking_time}</td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Havoc Sim Podium • Instructor Notification</p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: '"Havoc Sim Podium" <' + process.env.SMTP_USER + '>',
        to: instructor.email,
        subject: `New Booking: ${booking_date} at ${booking_time}`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Instructor email sent successfully to", instructor.email);
    } catch (err) {
        console.error("Error sending instructor email:", err);
    }
};

const sendInstructorOtpEmail = async (instructor, otp) => {
    if (!instructor.email) return { success: false, error: "No email address linked to instructor" };

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn(`[DEV OTP] SMTP credentials not set. Password Reset OTP for ${instructor.email} (${instructor.name}): ${otp}`);
        return { success: true, devMode: true };
    }

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #111114; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid rgba(229,184,105,0.25);">
        <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #e5b869; margin: 0 0 6px 0; font-size: 24px; letter-spacing: 1px;">HAVOC SIM PODIUM</h2>
            <p style="color: #888888; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Instructor Portal Security</p>
        </div>
        
        <div style="background-color: #1a1a1f; padding: 25px; border-radius: 10px; border: 1px solid #2a2a30; text-align: center;">
            <p style="font-size: 15px; margin-top: 0; color: #dddddd; text-align: left;">Hi <strong>${instructor.name || 'Instructor'}</strong>,</p>
            <p style="font-size: 14px; color: #aaaaaa; text-align: left; line-height: 1.5;">We received a request to reset your Instructor Portal password. Use the verification code below to complete the reset:</p>
            
            <div style="margin: 25px auto; padding: 15px 25px; background: #0a0a0c; border: 1px solid #e5b869; border-radius: 8px; display: inline-block;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e5b869; margin-left: 8px;">${otp}</span>
            </div>
            
            <p style="font-size: 13px; color: #888888; margin: 10px 0 0 0;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; color: #666666; font-size: 12px; line-height: 1.4;">
            <p style="margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="margin: 6px 0 0 0;">Havoc Sim Podium • <a href="https://havocsimpodium.com" style="color: #e5b869; text-decoration: none;">havocsimpodium.com</a></p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"Havoc Sim Podium Security" <${process.env.SMTP_USER}>`,
        to: instructor.email,
        subject: `Your Password Reset OTP: ${otp}`,
        text: `Hi ${instructor.name || 'Instructor'},\n\nYour OTP to reset your Havoc Sim Podium Instructor Portal password is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Instructor reset OTP email sent successfully to ${instructor.email}`);
        return { success: true };
    } catch (err) {
        console.error("Error sending instructor OTP email:", err);
        return { success: false, error: err.message };
    }
};

module.exports = { sendConfirmationEmail, sendBulkEmail, sendInstructorEmail, sendInstructorOtpEmail };
